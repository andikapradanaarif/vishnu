# Vishnu

Browser UI + thin proxy for driving `crush server` (`/v1` HTTP API incl. SSE).
Monorepo, bun workspaces — style/stack follows valo & nexus-bo-api.

## Layout

- `api/` — Go module `github.com/andikapradanaarif/vishnu`, Fiber v3 +
  Postgres/GORM. `cmd/{server,migrate}` → `internal/{config,domain,
  repository,usecase,dto,handler,service,migrator}` + `migration/`
  (embedded SQL). Owns the project registry (`/api/projects`, Postgres),
  the user/session tables behind email-OTP sign-in, and spawns one
  `crush server` per project; proxies `/p/{pid}/v1/*`
  to that project's upstream (SSE via SendStreamWriter, no upstream
  timeout). The api serves no SPA — `api/Dockerfile` (root context) +
  `api/deploy/docker-compose.yml` run the whole stack in docker —
  postgres + api (Go + baked-in `crush` binary) + web (nginx SPA
  front, proxies `/api` + `/p`).
- `web/` — Vite + React 19 + TS strict, TanStack Query, Tailwind v4,
  components from `@vishnu/ui-component` (`shared-ui/`), feature code in
  `src/features/<domain>/`. `web/Dockerfile` + `web/nginx.conf.template`
  build a standalone nginx image that serves the SPA and reverse-proxies
  `/api` and `/p` (SSE-safe) — the template is envsubst'd at start:
  `VISHNU_API_UPSTREAM` picks the api (default the compose service
  `http://vishnu:8080`, or any URL on another host/domain),
  `VISHNU_DNS_RESOLVER` overrides docker's `127.0.0.11`.
- `contract/` — `@vishnu/api-contract`: crush `/v1` wire types + per-domain
  SDK clients (`src/<domain>/{sdk,index.ts}`, nexus-contract style). `ApiClient`
  takes `defaultQuery` carrying `client_id`.
- `shared-ui/` — vendored copy of nexus `shared-ts` (`@vishnu/ui-component`).
- `docs/PLAN.md`, `docs/plan/{api,web,projects,data}.md` — architecture plans.

## Commands

- `bun install` — install all workspaces.
- `bun run build` (root) — builds shared-ui, then contract, then web.
- `contract/`: `bun run build` (tsc d.ts + bun build per entry), `bun run lint`.
- `web/`: `bun run dev` (vite :5173, proxies `/api` + `/p` → `VITE_API_UPSTREAM`, default `127.0.0.1:8080` — set it in `web/.env`, see `.env.example`, to point at a remote server), `bun run lint`, `bun run build`.
- `api/`: `make dev`, `make build` (→ bin/vishnu-api), `make test`, `make lint`.
- `api/` database: `make db` (compose Postgres on 5432), `make migrate`, `make migratedown`, `make migratestatus`. The server applies pending migrations on boot and exits with the fix-it command when Postgres is unreachable.
- `api/` docker stack: `make up` (`docker compose -f deploy/docker-compose.yml up -d --build`) brings up postgres + the api image (api + a pinned `crush` binary) + the web image (nginx SPA on `VISHNU_HOST_PORT`, proxying `/api` + `/p` to the api on loopback `VISHNU_API_PORT`); `make logs`; `docker compose -f deploy/docker-compose.yml run --rm vishnu migrate status|down`. Settings live in `api/deploy/.env` (copy `api/deploy/.env.example`) — compose interpolates it for postgres and hands it to the app, so `DB_*` configure both.
- `api/` prod deploy (valo-style GHCR flow): `make push-api` / `make push-web` build linux/amd64 images and push `ghcr.io/andikapradanaarif/vishnu-{api,web}` (`*/scripts/deploy-ghcr.sh`); on the server, `make deploy` runs `deploy/deploy.sh` — pulls both images, runs migrations, recreates `deploy/docker-compose.prod.yml`, health-checks `/healthz` through the web front, and rolls back on failure.
- `api/` tests: repository tests need a real Postgres — set `VISHNU_TEST_DB_DSN="host=127.0.0.1 port=5432 user=vishnu password=vishnu dbname=vishnu sslmode=disable"`, otherwise they skip.

## Runtime

```bash
cd api && make build && ./bin/vishnu-api   # API on http://127.0.0.1:8080
# vishnu spawns `crush server` per registered project (managed mode)
# UI: `cd web && bun run dev` (vite :5173 proxies /api + /p) or the docker stack
```

Env: `VISHNU_LISTEN_ADDR` (default `127.0.0.1:8080`, loopback only — a
shell-capable agent must not be LAN-exposed), `DB_{HOST,PORT,NAME,USER,PASS}`
(Postgres, plain values, defaults `127.0.0.1:5432` and db/user `vishnu`),
`VISHNU_BOOTSTRAP_EMAIL` (upserted as an admin user at startup),
`VISHNU_SESSION_TTL` (default `720h`), `VISHNU_PROJECTS_DIR` (clone
destination, default `$VISHNU_DATA_DIR/projects`), `VISHNU_CRUSH_BIN`,
`VISHNU_PORT_START` (default `9201`),
`BREVO_{API_KEY,API_URL,FROM_EMAIL,FROM_NAME}` (sign-in codes; when
unconfigured the code is logged so local sign-in still works).

Crush children need provider credentials or agent init 500s: compose
mounts `~/.config/crush` + `~/.local/share/crush` (VISHNU_CRUSH_*_DIR,
`~` = composing user's home — container crush runs as root), or pass
`CRUSH_<PROVIDER>_API_KEY` env (prefix mapped away; provider's default
models are auto-selected).

## Auth

Sign-in is an email address plus a one-time code — no passwords to store
or reset. `POST /api/auth/request-otp` answers 200 for known and unknown
addresses alike, so it cannot be used to enumerate who is allowed in; the
code is emailed via Brevo, expires in 10 minutes, tolerates 5 wrong
attempts, and is single-use. `POST /api/auth/verify` sets `vishnu_session`
(HttpOnly, `SameSite=Lax`, `Secure` over https), `POST /api/auth/logout`
revokes it, `GET /api/auth/me` returns the user. The middleware gates
`/api/*` except `/api/auth/*` and every `/p/*` path; the SPA shell stays
public because it renders the sign-in form. Sessions are stored hashed and
slide forward on use, so revoking means deleting the row.

## Crush wire notes

- Per-project routing: `/p/{pid}/v1/*` → prefix stripped → project
  upstream (EventSource can't set headers → project id lives in path).
- Workspace create: `POST /v1/workspaces` with `client_id` **in JSON body**.
- Agent coordinator is NOT created with the workspace — `GET …/agent`
  reports `is_ready`; when false, `POST /v1/workspaces/{id}/agent/init?client_id=`
  before prompts (TUI does this on open; vishnu does it in EnsureWorkspace,
  and lazily again in the proxy when `GET …/sessions` arrives — 30s
  recheck window, retries on failure).
- Other mutating endpoints take `?client_id=<uuid>` query param.
- Events: `GET /v1/workspaces/{id}/events?client_id=<uuid>` (SSE).
- Content parts are `{type, data}` envelopes; SSE payloads are `{type, payload}`.
- `.crush/` data dirs are locked per process — never share a project
  path between two crush processes.

## Conventions

- Go: gofumpt → goimports; slog messages capitalized; JSON snake_case.
- TS: oxlint/oxfmt; import UI only via `@vishnu/ui-component` subpath exports.
