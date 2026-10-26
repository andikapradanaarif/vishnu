# vishnu — personal web UI for crush sessions

**Status** — shipped: multi-project registry, email+OTP auth, and the
web SPA (project picker, sessions, chat, SSE, permissions/questions,
model & agent switching) in the vishnu retro-game theme. The manual
end-to-end pass lives in [`SMOKE.md`](SMOKE.md).

## Goal

A web app that lets me drive `crush` from a browser across several
projects: register projects, pick one, see its session list, open a
session, send prompts, watch it work — without the TUI. Personal tool,
localhost only. **One `crush server` process per project** — memory
and context stay isolated (and a shared server would hold `.crush/`
data-dir locks that block opening a TUI in the same project).

**No crush fork or patch needed**: every endpoint used
(sessions CRUD, `POST …/agent`, SSE `…/events`, `permissions/grant`,
`questions/answer`, `current-session`) exists verbatim in stock
upstream `charmbracelet/crush` — verified against upstream/main. The
app treats `crush server` as a black box; install the normal release
(`brew install crush` / `go install`) or reuse the fork build if its
memory features are wanted — both expose the same `/v1` surface this
app consumes.

## Architecture

`crush server` exposes the whole backend over HTTP
(`internal/server`, `internal/proto`) but emits no CORS headers, so a
browser can't talk to it directly. Vishnu's api is a same-origin
proxy + the project's registry/process manager:

```
browser ── http://127.0.0.1:8080 ──> vishnu api ─┬─> crush server A (proj A) :9201
│        index.html, assets            │       ├─> crush server B (proj B) :9202
│        React SPA                     │       └─> crush server C (proj C) :9203
│                                      ├─ /api/projects → registry CRUD/lifecycle
│                                      └─ /p/{pid}/v1/* → per-project proxy
```

Key decisions:

- **Per-project crush servers** (registry + managed spawn) — isolation,
  no `.crush/` lock fights with the TUI. See `plan/projects.md`.
- **`/p/{pid}` in the path, not a header** — `EventSource` can't set
  headers and the SSE URL must route to the right project.
- **SSE, not WebSocket** — the wire is already two half-channels:
  detached POSTs out (`POST …/agent` → 202, runs survive browser
  close), an SSE stream back. One reconnectable HTTP transport covers
  both.
- **Auth before off-loopback** — email+OTP planned (Brevo); until then
  bind stays `127.0.0.1`.

## Stack (valo/nexus style)

Bun-workspaces monorepo in the style of valo (`api/` + `backoffice/`)
and nexus (`backend/` + `backoffice/` + `contract/` + `shared-ts/`):

- **`api/`** — Go + Fiber v3 + **Postgres/GORM**, nexus-style clean
  architecture (`cmd/` → `internal/{domain,repository,usecase,dto,
  handler,service}` + embedded SQL `migration/`). Registry, process
  manager, `/p/{pid}/v1/*` streaming proxy, Brevo email
  service.
- **`web/`** — Vite + React 19 + TS strict, TanStack Query, Tailwind
  v4, oxlint/oxfmt. Single screen, `src/features/<domain>/` modules;
  primitives from `@vishnu/ui-component`.
- **`contract/`** — `@vishnu/api-contract`: crush `/v1` wire types +
  per-domain SDK clients (hand-mirrored — crush has no OpenAPI spec).
- **`shared-ui/`** — `@vishnu/ui-component`, vendored nexus `shared-ts`.

Detailed plans: [`plan/api.md`](plan/api.md) (API),
[`plan/web.md`](plan/web.md) (web frontend),
[`plan/projects.md`](plan/projects.md) (multi-project registry +
per-project crush servers — **decided**),
[`plan/data.md`](plan/data.md) (persistence — Postgres/GORM, migrations,
schema — **decided**),
[`plan/auth.md`](plan/auth.md) (email-OTP sign-in + eligibility store —
**shipped**).

Task docs (agent-assignment breakdowns): [`tasks/api.md`](tasks/api.md)
(api — 6 PRs).

## Project layout

```
vishnu/
  docs/PLAN.md            this file
  docs/plan/{api,web,projects,data}.md
  package.json            bun workspace root (shared-ui + contract + web)
  api/                    Go module (github.com/andikapradanaarif/vishnu)
    cmd/server/main.go    cmd/migrate/main.go
    migration/            embedded *.sql (+ _down) + MigrationOrder
    internal/migrator/    up/down/status runner
    internal/config/config.go
    internal/domain/      entities + repository interfaces
    internal/repository/  GORM impls (+ Repositories aggregator)
    internal/dto/  internal/usecase/
    internal/service/upstream_service.go
    internal/service/email/             Brevo EmailService (auth OTP later)
    internal/service/process/           crush lazy-spawn/health per project
    internal/service/cloner/            git eligibility check + async clone
    internal/handler/proxy_handler.go   /p/{pid}/v1/* streaming proxy
    internal/handler/project_handler.go /api/projects* CRUD + lifecycle
    Dockerfile              multi-stage: go → crush → alpine (api-only)
    deploy/docker-compose.yml           postgres + web + vishnu services
    entrypoint.sh  Makefile
  shared-ui/              @vishnu/ui-component — vendored nexus shared-ts
  contract/               @vishnu/api-contract — crush /v1 types + SDK
    src/types.ts          wire types · src/paths.ts route constants
    src/client.ts         ApiClient, ApiError, buildPath, withQuery
    src/<domain>/         sdk.ts + index.ts per domain
    scripts/build.sh      tsc d.ts + bun build per entry
  web/                    Vite + React + TS
    vite.config.ts        dev proxy: /v1 -> crush server (styling dev)
    src/App.tsx           shell: project pick → workspace ensure →
                          drawer, current-session
    src/services/         api (SDK wiring), queryClient, clientId, pendingStore
    src/hooks/            useCrushEvents (SSE dispatch), queries
    src/features/         projects/ sessions/ chat/ prompts/ topbar/
```

## Roadmap

1. ~~Single-workspace chat UI through the proxy~~ — **shipped**.
2. **Multi-project + DB** — Postgres/GORM + migrations land here
   (`plan/data.md`); project registry is the first consumer —
   registry, GitHub-clone add flow, managed crush spawn, `/p/{pid}`
   routing, project picker (`plan/projects.md`).
3. **Auth** — email + OTP against a DB-backed `users` allowlist
   (bootstrap via `VISHNU_BOOTSTRAP_EMAIL`), cookie session from
   `auth_sessions`, guard `/api` + `/p/*` (Brevo service in place;
   schema in `plan/data.md`).
4. Later — mobile polish/PWA, per-project logs view, "park" action,
   auto-restart policies, per-user project ACLs.

## Run flow

```bash
# dev (host-native): postgres in docker, api + crush on the host
cd vishnu/api && make db && make migrate && make dev

# prod: docker — web image (nginx SPA + proxy) + api image (go + crush
# binary); compose runs postgres + web + vishnu (restart: unless-stopped)
docker compose -f api/deploy/docker-compose.yml up -d --build
# env: VISHNU_LISTEN_ADDR, DB_*, VISHNU_DATA_DIR, VISHNU_PROJECTS_DIR,
#      VISHNU_CRUSH_BIN, VISHNU_PORT_START
```

Browser opens `http://127.0.0.1:8080` → Add project (GitHub link —
access-checked + cloned, or an existing local path) → select →
sessions. Selecting a project spawns its crush if it isn't running
(lazy start — covers restarts and crashes too); deleting stops it.
Managed crushes die with vishnu; `mode: external` projects (crushes
you run yourself) are only routed, never touched.

## Security posture (Debian server)

- Runs as a docker compose stack on a Debian server (`restart:
  unless-stopped`); the browser reaches it remotely. Loopback publish
  `127.0.0.1:8080` stays the default — access via
  **SSH tunnel** (`ssh -L 8080:127.0.0.1:8080 server`, zero config) or
  **Tailscale** (bind `tailscale0` / `tailscale serve` — the
  phone-friendly option).
- `0.0.0.0`/LAN binding ships only after auth lands — the API grants
  shell execution through the agent.
- Git eligibility checks (`git ls-remote`) and clones run with the
  **server's** git credentials — SSH deploy keys or a credential
  helper must be configured server-side for private repos.
- Permission prompts render tool name + what's being asked, not raw
  JSON. Project paths are `os.Stat`-validated before a crush gets a
  foothold in them.

## Out of scope for v1

- Multiple workspaces per project server (vishnu uses the one
  workspace matching the project path)
- Explicit start/stop or "park" lifecycle (lazy start on select covers
  it; managed crushes die with vishnu)
- Per-project crush log viewer (ring buffer exists; UI later)
- Plan-mode approval, queued-prompt management, slash commands,
  attachments upload, LSP/MCP panels, file tracker
- Auth/multi-user (Brevo service is in place; email+OTP planned)
- Message editing/regenerate

## Decisions / open questions

- [x] One crush server vs per-project — **decided**: one per project
      (data-dir lock + blast radius). See `plan/projects.md`.
- [x] Proxy in Go vs Node — **decided**: Go/Fiber v3, shipping.
- [x] UI transport — **decided**: SSE + detached POSTs, no WebSocket.
- [x] Project lifecycle — **decided**: create/delete only; managed
      crush lazy-starts on select (no start/stop endpoints).
- [ ] `permissions skip` as a v1 toggle vs left to `crushrc`.
- [ ] Attachments (file upload) — `AgentMessage.Attachments` exists;
      defer unless needed.
