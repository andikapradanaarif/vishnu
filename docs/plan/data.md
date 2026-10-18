# Vishnu — persistence plan

Status: shipped. `api/migration/` creates exactly this schema, and the
project registry, the eligibility list, the one-time codes, and the
sessions all live in it.

Scope: Postgres + GORM + embedded SQL migrations, mirroring the nexus
`backend` layout (`domain → repository → usecase → handler`). Project
behavior lives in `projects.md`; user/OTP flows land here when the auth
milestone is planned in detail.

## Stack and layout

| Concern | Choice |
| --- | --- |
| DB | Postgres 17 — `api/deploy/docker-compose.yml`, service `postgres` |
| ORM | GORM — `db.WithContext(ctx)` on every call |
| Migrations | `api/migration/` — `//go:embed *.sql`, `MigrationOrder` slice, paired `<name>.sql` + `<name>_down.sql` |
| Runner | `api/internal/migrator` — `EnsureTable` / `Up` / `Down` / `Status`, `migrations` tracking table, one transaction per migration |
| CLI | `api/cmd/migrate` — `up` (default) / `down` / `status` |

The nexus `migration/embed_check_test.go` parity test comes along: every
name in `MigrationOrder` must have an embedded `.sql`, and vice versa.

## Config

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` — same env names as
nexus, but plain values (nexus's base64 decoding is a deploy quirk vishnu
doesn't inherit). Defaults for dev: `127.0.0.1:5432`, db/user `vishnu`.
`config.ConnectPostgres()` builds the DSN.

## Layering (nexus clean architecture)

```
internal/domain/      entities + repository interfaces (Project, User…)
internal/repository/  GORM impls — unexported struct,
                      NewXRepository(db) domain.XRepository;
                      Repositories aggregator (NewRepositories(db))
internal/dto/         request/response contracts
internal/usecase/     business logic — project add/clone orchestration,
                      dedupe, eligibility checks
internal/handler/     thin fiber handlers
internal/service/     infra + externals only — upstream, process mgr,
                      cloner (git), email
```

Rules: lower layers never import higher; interfaces exported,
implementations unexported; soft-delete via `gorm.DeletedAt`; UUID PKs;
`timestamptz` with `default:now()`.

## Schema

### `projects` (first migration)

```sql
CREATE TABLE projects (
    id         uuid PRIMARY KEY,
    name       text        NOT NULL,
    path       text,                       -- managed/link: repo dir; external: null
    mode       text        NOT NULL,       -- 'managed' | 'external'
    port       integer,                    -- managed only
    repo_url   text,                       -- clone mode only
    upstream   text,                       -- external only
    status     text        NOT NULL,       -- 'cloning' | 'ready' | 'error'
    error      text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE UNIQUE INDEX projects_path_unique    ON projects (path)     WHERE path IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX projects_repo_url_unique ON projects (repo_url) WHERE repo_url IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX projects_upstream_unique ON projects (upstream) WHERE upstream IS NOT NULL AND deleted_at IS NULL;
```

**Status model change** (supersedes the registry-record sketch in
`projects.md`): the persisted `status` is lifecycle only —
`cloning | ready | error`. Runtime liveness (`down | starting | up`) is
computed by the process manager and merged at read time, never written
to the row. API responses expose the merged effective status
(`cloning | down | starting | up | error`). This removes the
boot-reconciliation edge case entirely.

### `users` — allowlist (auth milestone)

No open registration: OTP is only sent to emails already in `users`.
First user is bootstrapped from `VISHNU_BOOTSTRAP_EMAIL` at server
start (upsert, role `admin`); further users via `POST /api/users`
(admin-only) once the auth milestone lands.

```sql
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id         uuid PRIMARY KEY,
    email      citext      NOT NULL,
    name       text,
    role       text        NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE UNIQUE INDEX users_email_unique
    ON users (email) WHERE deleted_at IS NULL;
```

### `otp_codes`

```sql
CREATE TABLE otp_codes (
    id          uuid PRIMARY KEY,
    email       citext      NOT NULL,
    code_hash   text        NOT NULL,   -- sha256; plaintext never stored
    attempts    int         NOT NULL DEFAULT 0,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX otp_codes_email_created
    ON otp_codes (email, created_at DESC);
```

OTP: 6 digits, 10-min TTL, max 5 `attempts`, resend cooldown = count
recent rows per `email` (no separate rate-limit table needed).

### `auth_sessions`

```sql
CREATE TABLE auth_sessions (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   text NOT NULL,         -- sha256; raw token lives only in the cookie
    expires_at   timestamptz NOT NULL,
    last_seen_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX auth_sessions_token_hash ON auth_sessions (token_hash);
```

Session cookie `vishnu_session=<opaque>` — HttpOnly, SameSite=Lax,
`Secure` when served over TLS, 30-day sliding expiry (`expires_at`
bumped on `last_seen_at`).

### Auth flow (for `api.md`)

`POST /api/auth/request-otp {email}` → always 200 (don't leak
membership); sends via Brevo only if email is in `users`.
`POST /api/auth/verify {email, code}` → compares hash, enforces
attempts/expiry, marks `consumed_at`, inserts `auth_sessions`, sets
cookie. `POST /api/auth/logout` deletes the row. `GET /api/auth/me`
returns the user for the SPA shell. Middleware guards `/api/*` (except
`/api/auth/*`) and `/p/*` — the SPA itself stays public (it renders the
login gate).

No Redis: OTP and session state live in Postgres — right-sized for a
single-user server, and `deleted_at`/`expires_at` keep cleanup trivial.

## Commands

```bash
make db              # docker compose -f deploy/docker-compose.yml up -d postgres
make migrate         # go run ./cmd/migrate (up)
make migratedown     # rollback last
make migratestatus   # applied vs pending
```

(The same compose file carries the `vishnu` app service — see the
deployment section of `api.md`; `make db` brings up only postgres for
host-native dev.)

`make dev` should fail fast with a clear "postgres unreachable — run
`make db && make migrate`" when the DB is down, since `/api/projects`
can't serve without it.

## Tests

- `migrator` — up/down/status on a throwaway DB (dockertest or compose
  service in CI)
- `embed_check_test` — order↔files parity (port from nexus)
- `project_repository` — CRUD + unique-index dedupe + soft delete
- `usecase` — clone/link/external create paths against a fake cloner
  and real DB

## Deliberate deviations from nexus

- No i18n catalogs or sentinel-error registry — vishnu is
  single-locale; handlers return plain `{message, code}` JSON. Revisit
  only if vishnu grows a second consumer.
- No Redis, no worker, no handler contexts (admin/client split) — one
  user, one context.
- Plain (non-base64) `DB_*` envs.
