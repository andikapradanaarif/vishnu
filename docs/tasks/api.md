# api/ implementation — agent task breakdown

Assignee: implement the `api/` Go module end to end, per the plan docs.
Work is split into **6 PR-sized milestones** — land them in order; each
PR must build, vet, format clean, and pass its tests independently.
Commit per topic inside a PR.

Canonical docs: `docs/PLAN.md` (grand), `plan/api.md` (proxy/routes/
deployment), `plan/projects.md` (registry/lifecycle/clone flow),
`plan/data.md` (schema/layering/migrations). When doc and code
disagree, the doc wins — or flag it.

## Conventions (nexus/valo style — non-negotiable)

- Module `github.com/andikapradanaarif/vishnu`, root `api/`,
  Fiber v3 (`c.Bind().Body(&req)`, `c.RequestCtx()` for ctx),
  `log/slog`, gofumpt+goimports, `CGO_ENABLED=0` builds.
- Clean architecture: `internal/domain` (entities + repository
  interfaces) → `internal/repository` (GORM impls, unexported structs,
  `NewXRepository(db) domain.XRepository`) → `internal/usecase` →
  `internal/handler`. `internal/service` is infra/externals only.
  Lower layers never import higher.
- GORM: `db.WithContext(ctx)` on every call; UUID PKs; `timestamptz
  default:now()`; soft delete via `gorm.DeletedAt`.
- Migrations: `migration/` package, `//go:embed *.sql`, ordered by
  `MigrationOrder`, always paired `<name>.sql` + `<name>_down.sql`.
- Errors: usecase returns typed/sentinel errors; handler maps to
  `{message, code?}` JSON. No i18n stack.
- No comments unless the code can't say it; snake_case JSON tags.
- Do NOT touch `web/`, `contract/`, `shared-ui/` in these PRs.

## Global verification (run before every commit)

```bash
cd api && gofmt -l . && go vet ./... && go build ./... && go test ./...
```

---

## PR 1 — persistence foundation

**Goal:** Postgres up, migrations running, zero domain code yet.

- `docker-compose.yml` (api/ root): `postgres:17-alpine`,
  `POSTGRES_*` from `DB_*` envs (`vishnu`/`vishnu`/`vishnu`), port
  5432, named volume, `pg_isready` healthcheck. (Copy nexus's shape.)
- `internal/config/db.go`: `ConnectPostgres() (*gorm.DB, error)` —
  DSN from `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS` (defaults
  `127.0.0.1:5432`, db `vishnu`, user `vishnu`; `DB_PASS` required in
  prod env, dev default `vishnu`), `gorm.Open(postgres.Open(dsn))`,
  `SkipDefaultTransaction: true`, logger → slog bridge or
  `logger.Warn` level. Plain envs — NOT base64.
- `internal/config/config.go`: add the `DB_*` reads + a `Database`
  struct field on `Config`.
- `migration/` package: `migrations_order.go` (`//go:embed *.sql`,
  `MigrationOrder []string`, `GetMigrationSQL`, `GetCreateMigrationsTableSQL`),
  `create_migrations_table.sql` (the tracking table itself, run first
  outside the ordered list — copy nexus's semantics).
- `internal/migrator/migrator.go`: `Runner` — `EnsureTable`,
  `Up` (skip applied, per-migration tx, insert into `migrations`),
  `Down` (rollback latest via `<name>_down.sql`, `ErrNoDownMigration`),
  `Status`. Port nexus `internal/migrator/migrator.go` nearly verbatim.
- `migration/embed_check_test.go`: every `MigrationOrder` entry has a
  `.sql`; every embedded `<name>.sql` is in the order; downs exist.
- `cmd/migrate/main.go`: `up` (default) / `down` / `status` —
  port nexus `cmd/migrate`.
- `Makefile`: `db` (`docker compose up -d postgres`), `migrate`,
  `migratedown`, `migratestatus`.
- Acceptance: `make db && make migrate` applies `migrations` table +
  reports clean status on a fresh DB; `make migratedown` rolls back.

## PR 2 — `projects` domain + repository

**Goal:** `projects` table + GORM repository behind a domain interface.

- `migration/create_projects_table.sql` + `_down.sql` — schema per
  `data.md` exactly (uuid PK, `path`/`port`/`repo_url`/`upstream`
  nullable, `status` text, `error` text, timestamps, `deleted_at`,
  three partial-unique indexes). Append to `MigrationOrder`.
- `internal/domain/project_domain.go`: `Project` entity (gorm tags),
  `ProjectMode` (`managed|external`), `ProjectStatus`
  (`cloning|ready|error`), `ProjectRepository` interface —
  `List(ctx)`, `GetByID(ctx,id)`, `Create(ctx,*Project)`,
  `Update(ctx,*Project)`, `SoftDelete(ctx,id)`, plus
  `SetStatus(ctx,id,status,errMsg)`; sentinel `ErrProjectNotFound`,
  `ErrProjectConflict` in `internal/errs/` (or domain — follow
  whichever you implement first, document it).
- `internal/repository/project_repository.go` + `repository.go`
  aggregator (`Repositories{Project domain.ProjectRepository}`).
  Map Postgres unique-violation (SQLSTATE 23505) → `ErrProjectConflict`;
  `ErrRecordNotFound` → `ErrProjectNotFound`.
- Tests (`project_repository_test.go`): CRUD, dedupe on each unique
  column, soft-delete hides rows but frees the unique index, List
  ordering (`created_at`). Use a real Postgres (compose service or
  `VISHNU_TEST_DB_DSN` env) — no sqlite fakery.

## PR 3 — process manager + cloner services

**Goal:** the two infra services, independently testable.

- `internal/service/process/manager.go`: `Manager` —
  - `Ensure(ctx, p domain.Project) (upstreamURL string, error)`:
    if alive (health `GET :port/v1/health`, ~500ms timeout) return URL;
    else `exec.CommandContext(crushBin, "server", "--host",
    "tcp://127.0.0.1:<port>")` with `Dir=p.Path`, wait-health loop
    (poll ~100ms, overall timeout ~15s → error). Single-flight per
    pid (mutex per project — concurrent Ensure must not double-spawn).
  - `Stop(ctx, id)` — SIGTERM + wait with deadline, SIGKILL fallback.
  - `Shutdown(ctx)` — SIGTERM all managed children.
  - `LiveStatus(id)` → `down|starting|up` (in-memory, health-cached
    ~3s). Port allocation: probe `net.Listen` upward from
    `VISHNU_PORT_START`, persist chosen port on the row (usecase does
    the write — manager exposes `AllocPort()`).
  - Per-project ring buffer (~1000 lines) capturing child
    stdout/stderr → `Logs(id)` accessor.
  - `external` projects: `Ensure` never spawns — returns
    `p.Upstream`, health-check only.
- `internal/service/cloner/cloner.go`:
  - `NormalizeRepoURL(raw) (url, slug string, err error)` — accept
    `owner/repo`, `https://github.com/o/r(.git)?`,
    `git@github.com:o/r(.git)?`; reject non-github + malformed.
  - `CheckAccess(ctx, url) error` — `git ls-remote <url> HEAD`,
    ~10s timeout, non-zero → typed unreachable error.
  - `Clone(ctx, url, destDir, onDone func(err error))` — background
    `git clone <url> <dest>`; `onDone` reports terminal status.
    `AllocDir(slug)` under `VISHNU_PROJECTS_DIR`, `-2`/`‑3` suffix.
- Tests: URL normalization table (all 4 forms + rejects), `AllocDir`
  collisions, health-wait against `httptest` server, `CheckAccess`
  against a local bare repo (positive) + bogus URL (negative),
  manager Ensure/Stop with a fake `crush` script on PATH.

## PR 4 — projects usecase + handler + `/api/projects` routes

**Goal:** the registry is usable over HTTP.

- `internal/dto/project_dto.go`: `CreateProjectRequest` (`name?`,
  `repo_url?`, `path?`, `upstream?` — mode inferred: repo_url→clone,
  path→link, upstream→external; exactly one source required),
  `ProjectResponse` (id/name/mode/path/repo_url/upstream/port/
  `status` merged + `error`).
- `internal/usecase/project_usecase.go`: `ProjectUsecase` —
  `Create` (validate → normalize → `CheckAccess` for clone → alloc
  port + dir → insert row; clone mode: `status=cloning` + kick
  `cloner.Clone` with callback writing `ready`/`error`; return 202
  body), `List` (rows + `LiveStatus` merge → effective status),
  `Delete` (`process.Stop` if managed → `SoftDelete`),
  `EnsureWorkspace(ctx,id)` → proc.Ensure → list upstream workspaces
  (`GET /v1/workspaces` via upstream client) → match `p.Path` →
  `POST /v1/workspaces {path, client_id:<server-uuid>}` if missing →
  return `{workspace_id}`.
- `internal/service/upstream_service.go`: add a typed
  `Client`/`Call` helper for server-side crush calls (list/create
  workspace, health) — reuse the same http.Client.
- `internal/handler/project_handler.go`: `GET /api/projects`,
  `POST /api/projects` (202 for clone, 201 link/external),
  `DELETE /api/projects/:id`, `GET /api/projects/:id/workspace`.
  Errors: 400 invalid, 403 unreachable repo, 404 unknown id, 409
  conflict, 502 crush unreachable.
- `cmd/server/main.go`: connect DB → migrator `Up` on boot (fail
  fast with "run make db && make migrate" if unreachable) →
  repositories → services (process mgr + cloner + email + upstream)
  → usecases → handlers → routes; graceful shutdown calls
  `process.Shutdown`.
- Tests: usecase with fake repo/cloner/proc-mgr (all three create
  modes, dedupe→409, delete stops+soft-deletes); handler tests via
  `app.Test`.

## PR 5 — proxy refactor `/v1/*` → `/p/{pid}/v1/*`

**Goal:** per-project upstream resolution.

- `internal/handler/proxy_handler.go`: `{pid}` → repository lookup →
  `manager.Ensure` → forward stripped path to resolved upstream.
  404 unknown pid; 503 `status=cloning|error`; 502 spawn/health
  timeout. Streaming mechanics unchanged (SendStreamWriter,
  flush-per-read, no upstream timeout, strip hop-by-hop headers —
  keep existing code).
- Remove the old `/v1/*` route + `VISHNU_CRUSH_UPSTREAM` env.
- Tests: two fake upstreams, assert correct per-pid routing; SSE
  passthrough; unknown pid → 404.

## PR 6 — auth (users + OTP + sessions)

**Goal:** `/api/*` + `/p/*` behind email-OTP cookie auth.

- Migrations + domain + repositories for `users`, `otp_codes`,
  `auth_sessions` — schemas per `data.md` exactly.
- `internal/usecase/auth_usecase.go`: `RequestOTP` (always 200;
  only sends when email ∈ users — generate 6-digit code, store
  sha256, resend cooldown 60s via row count), `Verify` (attempts ≤5,
  expiry, consume → create session → cookie), `Logout`, `Me`.
- `internal/service/email` — already shipped (Brevo); usecase sends
  `EmailPayload{To: email, Subject: "Your vishnu code", HtmlBody/…}`.
- `internal/middleware/auth.go`: read `vishnu_session` cookie →
  sha256 → `auth_sessions` lookup (expiry check, bump `last_seen_at`
  throttled ~1/min) → `c.Locals("user", u)`; 401
  `{message:"unauthorized"}`. Mount on `/api` (skip `/api/auth/*`)
  + `/p`.
- `internal/handler/auth_handler.go`: `POST /api/auth/request-otp`,
  `/verify`, `/logout`, `GET /api/auth/me`.
- Boot: upsert `VISHNU_BOOTSTRAP_EMAIL` as `admin` user.
- Config: `VISHNU_BOOTSTRAP_EMAIL`, `VISHNU_SESSION_TTL` (720h).
- Cookie: HttpOnly, SameSite=Lax, `Secure` only when
  `c.Protocol()=="https"`, path `/`.
- Tests: OTP issue/verify/expiry/attempts/consume-once; session
  create/lookup/sliding expiry; middleware 401 vs pass-through;
  request-otp non-enumeration (unknown email still 200).

## Definition of done (whole epic)

- `make db && make migrate` clean; `go build/vet/test` green;
  `gofumpt`/`goimports` clean.
- Live smoke: add link-mode project → select → workspace ensured →
  `GET /p/{pid}/v1/workspaces/{wid}/sessions` proxies; SSE stream
  opens; OTP login works end-to-end via real Brevo key (or logged
  code in dev if `BREVO_API_KEY` unset — acceptable: log the code
  and document it).
- `AGENTS.md` commands/env tables updated; plan docs' Status lines
  flipped to reflect shipped state.
