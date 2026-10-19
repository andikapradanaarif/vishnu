# Vishnu

A web UI for driving [Crush](https://github.com/charmbracelet/crush)
agent sessions across multiple projects — list, create, and delete
sessions; chat with streaming responses; answer permission and question
prompts; switch models and agents — from a browser, on any device.

Vishnu runs a single Go binary that owns a **project registry**
(Postgres), lazily spawns **one `crush server` per project**, and
reverse-proxies each project's `/v1` HTTP + SSE API — so an agent run
continues server-side even after you close the tab.

Built for deployment on a Debian server via Docker Compose (the image
builds the SPA, api, and a `crush` binary together), reachable over SSH
tunnel or Tailscale.

## Architecture

```
browser ──> vishnu api (Fiber v3, :8080)
            ├─ /api/auth/*           email + OTP login → session cookie
            ├─ /api/projects*        project registry (Postgres)
            ├─ /p/{pid}/v1/*         proxy → that project's crush server
            │    ├─ project A: crush server tcp://127.0.0.1:9201
            │    ├─ project B: crush server tcp://127.0.0.1:9202
            │    └─ …spawned lazily on select, restarted on demand
            └─ /*                    embedded SPA
```

Key decisions:

- **Per-project crush processes** — sessions and memory live in each
  project's own `.crush/` DB; isolation, no lock fights with a
  `crush` TUI, one project crashing doesn't take others down.
- **`/p/{pid}` in the path** — `EventSource` can't set headers, so
  per-project routing lives in the URL.
- **SSE over one reconnectable HTTP stream** — the wire is already two
  half-channels (detached POSTs out, SSE back); runs survive browser
  disconnect.
- **Auth before network exposure** — email+OTP login (Brevo) guards
  everything once you bind beyond loopback; the API grants shell
  execution through the agent.

## Repository layout

```
vishnu/
  api/          Go module — Fiber v3 + Postgres/GORM, nexus-style
                clean architecture (domain → repository → usecase →
                handler), embedded SQL migrations, process manager,
                git cloner, Brevo email, streaming proxy, embedded SPA
  web/          Vite + React 19 + TS — feature modules under
                src/features/<domain>/, TanStack Query, Tailwind v4
  contract/     @vishnu/api-contract — crush /v1 wire types + typed
                SDK clients (workspaces, sessions, agent, config,
                permissions, questions, events)
  shared-ui/    @vishnu/ui-component — component library (vendored
                from nexus shared-ts)
  docs/         PLAN.md (grand plan) · plan/ (design docs) ·
                tasks/ (agent-assignment breakdowns)
```

## Prerequisites

- **Go** 1.26+ and **Bun** 1.4+
- **Docker** (for Postgres via compose) or a system Postgres 17
- **`crush`** binary on the server's `$PATH` (or set `VISHNU_CRUSH_BIN`)
- For GitHub-clone adds: git credentials on the server that can access
  the repo (SSH deploy key, credential helper, or `gh auth`)

## Quick start

**Production — everything in Docker**:

```bash
# Builds the SPA + api + crush into one image, runs postgres + vishnu
docker compose -f api/deploy/docker-compose.yml up -d --build
# → http://127.0.0.1:8080 (loopback — tunnel/Tailscale for remote)

# Settings/credentials: cp api/deploy/.env.example api/deploy/.env
# Schema ops against the running stack:
docker compose -f api/deploy/docker-compose.yml run --rm vishnu migrate status
```

**Development** (postgres in docker, api + crush on the host):

```bash
bun install && bun run build   # shared-ui → contract → web
cd api
make db && make migrate        # postgres + schema
make dev                       # http://127.0.0.1:8080 (VISHNU_WEB_DIR=../web/dist)
```

`cd web && bun run dev` gives Vite HMR on :5173 during UI work.

## Adding a project

Three modes (`POST /api/projects`):

| Mode | Body | What happens |
| --- | --- | --- |
| Clone from GitHub | `{repo_url, name?}` | `git ls-remote` access check → async clone into `VISHNU_PROJECTS_DIR` → status `cloning` → `ready`/`error` |
| Link local path | `{name, path}` | `os.Stat`-validated directory, registered ready |
| External server | `{name, upstream}` | attach a crush you run yourself — routed, never started/stopped |

Selecting a project lazy-starts its crush server (covers first use,
vishnu restarts, and crashes), then ensures the workspace exists.
Deleting a project stops its crush and removes the registry row —
files on disk are never touched.

## Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `VISHNU_LISTEN_ADDR` | `127.0.0.1:8080` | bind address — keep loopback; tunnel/Tailscale for remote |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | `127.0.0.1` / `5432` / `vishnu` / `vishnu` / — | Postgres |
| `VISHNU_DATA_DIR` | `~/.local/share/vishnu` | runtime data dir |
| `VISHNU_PROJECTS_DIR` | `$VISHNU_DATA_DIR/projects` | where GitHub clones land |
| `VISHNU_CRUSH_BIN` | `crush` | binary spawned for managed projects |
| `VISHNU_PORT_START` | `9201` | first port probed upward for crush servers |
| `VISHNU_WEB_DIR` | embed | serve SPA from disk (dev) |
| `BREVO_API_KEY` / `BREVO_API_URL` / `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` | — / `https://api.brevo.com` / — / — | OTP email delivery |
| `VISHNU_BOOTSTRAP_EMAIL` | unset | first `admin` user, upserted at boot |
| `VISHNU_SESSION_TTL` | `720h` | auth session lifetime |
| `VISHNU_EMAIL_TIMEOUT` / `VISHNU_ENV` | `10s` / `development` | Brevo timeout / email subject prefix |

## Commands

| Where | Command | Does |
| --- | --- | --- |
| root | `bun run build` / `bun run lint` | shared-ui → contract → web |
| `api/` | `make dev` · `make build` · `make test` · `make db` · `make migrate` | dev run, prod binary, tests, postgres, schema |
| `web/` | `bun run dev` · `bun run build` · `bun run lint` | Vite HMR, prod build, oxlint |
| `contract/` | `bun run build` | tsc d.ts + bun build per domain entry |

## Status

Shipped: single-workspace chat through the proxy — sessions CRUD,
streaming chat, permission/question prompts, model/agent switcher.

In progress: **multi-project + DB** (registry, GitHub-clone adds,
per-project crush processes), then **auth** (email OTP against a
`users` allowlist). Full roadmap and design docs in [`docs/`](docs/PLAN.md).
