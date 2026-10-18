# Vishnu

Browser UI + thin proxy for driving `crush server` (`/v1` HTTP API incl. SSE).
Monorepo, bun workspaces — style/stack follows valo & nexus-bo-api.

## Layout

- `api/` — Go module `github.com/andikapradanaarif/vishnu`, Fiber v3 +
  Postgres/GORM. `cmd/{server,migrate}` → `internal/{config,domain,
  repository,usecase,dto,handler,service,migrator}` + `migration/`
  (embedded SQL). Owns the project registry (`/api/projects`, Postgres)
  and spawns one `crush server` per project; proxies `/p/{pid}/v1/*`
  to that project's upstream (SSE via SendStreamWriter, no upstream
  timeout), serves embedded SPA. `api/Dockerfile` (root context) +
  `api/deploy/docker-compose.yml` run the whole stack in docker —
  postgres + app incl. a baked-in `crush` binary.
- `web/` — Vite + React 19 + TS strict, TanStack Query, Tailwind v4,
  components from `@vishnu/ui-component` (`shared-ui/`), feature code in
  `src/features/<domain>/`.
- `contract/` — `@vishnu/api-contract`: crush `/v1` wire types + per-domain
  SDK clients (`src/<domain>/{sdk,index.ts}`, nexus-contract style). `ApiClient`
  takes `defaultQuery` carrying `client_id`.
- `shared-ui/` — vendored copy of nexus `shared-ts` (`@vishnu/ui-component`).
- `docs/PLAN.md`, `docs/plan/{api,web,projects,data}.md` — architecture plans.

## Commands

- `bun install` — install all workspaces.
- `bun run build` (root) — builds shared-ui, then contract, then web.
- `contract/`: `bun run build` (tsc d.ts + bun build per entry), `bun run lint`.
- `web/`: `bun run dev` (vite, proxies `/v1` → `127.0.0.1:9119`), `bun run lint`, `bun run build`.
- `api/`: `make dev` (VISHNU_WEB_DIR=../web/dist), `make build` (embeds web/dist → bin/vishnu-api), `make test`, `make lint`.

## Runtime

```bash
cd api && make build && ./bin/vishnu-api   # http://127.0.0.1:8080
# vishnu spawns `crush server` per registered project (managed mode)
```

Env: `VISHNU_LISTEN_ADDR` (default `127.0.0.1:8080`, loopback only — a
shell-capable agent must not be LAN-exposed), `VISHNU_DATA_DIR`
(registry, default `~/.local/share/vishnu`), `VISHNU_CRUSH_BIN`,
`VISHNU_PORT_START` (default `9201`), `VISHNU_WEB_DIR` (dev override),
`BREVO_*` (auth email, later).

## Crush wire notes

- Per-project routing: `/p/{pid}/v1/*` → prefix stripped → project
  upstream (EventSource can't set headers → project id lives in path).
- Workspace create: `POST /v1/workspaces` with `client_id` **in JSON body**.
- Other mutating endpoints take `?client_id=<uuid>` query param.
- Events: `GET /v1/workspaces/{id}/events?client_id=<uuid>` (SSE).
- Content parts are `{type, data}` envelopes; SSE payloads are `{type, payload}`.
- `.crush/` data dirs are locked per process — never share a project
  path between two crush processes.

## Conventions

- Go: gofumpt → goimports; slog messages capitalized; JSON snake_case.
- TS: oxlint/oxfmt; import UI only via `@vishnu/ui-component` subpath exports.
