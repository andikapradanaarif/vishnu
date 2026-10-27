# Vishnu

A web UI for driving [Crush](https://github.com/andikapradanaarif/crush)
agent sessions across multiple projects — list, create, and delete
sessions; chat with streaming responses; answer permission and question
prompts; switch models and agents — from a browser, on any device.

Vishnu runs a single Go binary that owns a **project registry**
(Postgres), lazily spawns **one `crush server` per project**, and
reverse-proxies each project's `/v1` HTTP + SSE API — so an agent run
continues server-side even after you close the tab.

Two independently deployable Docker images: a `web` image (nginx serving
the static SPA + `/api`/`/p` reverse proxy) fronts a `vishnu-api` image
(Go + a baked-in `crush` binary). Deploy them on one host or on
separate servers/domains.

## Architecture

```
browser ──> vishnu web (nginx :80)      SPA + /api,/p proxy
            └─> vishnu api (Fiber v3, :8080)
                ├─ /api/auth/*           email + OTP login → session cookie
                ├─ /api/projects*        project registry (Postgres)
                └─ /p/{pid}/v1/*         proxy → that project's crush server
                     ├─ project A: crush server tcp://127.0.0.1:9201
                     ├─ project B: crush server tcp://127.0.0.1:9202
                     └─ …spawned lazily on select, restarted on demand
```

Key decisions:

- **Per-project crush processes** — sessions and memory live in each
  project's own `.crush/` DB; isolation, no lock fights with a
  `crush` TUI, one project crashing doesn't take others down.
- **`/p/{pid}` in the path** — `EventSource` can't set headers, so
  per-project routing lives in the URL.
- **SSE over one reconnectable HTTP stream** — the wire is already two
  half-channels (detached POSTs out, SSE back); runs survive browser
  disconnect. Pending permission prompts are replayed and reconciled
  against a server-truth endpoint, so a dropped stream can't strand a
  run.
- **Auth before network exposure** — email+OTP login (Brevo) guards
  everything once you bind beyond loopback; the API grants shell
  execution through the agent.

## The crush fork

The agent engine is the fork
[andikapradanaarif/crush](https://github.com/andikapradanaarif/crush) —
upstream [charmbracelet/crush](https://github.com/charmbracelet/crush)
is **not supported**. It lacks the server endpoints vishnu calls
(pending-prompt replay, per-session permission skip, the
pending-permission list) and hard-fails on the fork-only `crushrc`
option keys.

The api image builds the fork from a pinned commit
(`CRUSH_REF`/`CRUSH_VERSION` args in `api/Dockerfile`). For local dev,
build the fork and point `VISHNU_CRUSH_BIN` at it — an upstream binary
is not a drop-in.

## Repository layout

```
vishnu/
  api/          Go module — Fiber v3 + Postgres/GORM, clean
                architecture (domain → repository → usecase →
                handler), embedded SQL migrations, crush process
                manager, git cloner, Brevo email, streaming proxy
  web/          Vite + React 19 + TS — feature modules under
                src/features/<domain>/, TanStack Query, Tailwind v4;
                Dockerfile + nginx.conf.template → nginx image serving
                the SPA and proxying /api + /p (VISHNU_API_UPSTREAM
                picks the api — any host/domain)
  contract/     @vishnu/api-contract — crush /v1 wire types + typed
                SDK clients (workspaces, sessions, agent, config,
                permissions, questions, events)
  shared-ui/    @vishnu/ui-component — vendored React component
                library consumed by web via workspace dependency
  docs/         ARCHITECTURE.md (system reference) · PLAN.md +
                plan/ (design docs) · tasks/ (agent assignments)
```

## Prerequisites

- **Docker** (for the compose stack and image builds)
- **Go** 1.26+ and **Bun** 1.4+ (development only)
- For GitHub-clone adds: git credentials on the server that can access
  the repo (SSH deploy key, credential helper, or `gh auth`). The api
  image bakes GitHub's host keys, so containerized clones just work.

## Quick start

**Everything in Docker** — postgres + api + web:

```bash
cp api/deploy/.env.example api/deploy/.env   # fill in values
docker compose -f api/deploy/docker-compose.yml up -d --build
# → http://127.0.0.1:8080 (loopback — tunnel/Tailscale for remote)

# Schema ops against the running stack:
docker compose -f api/deploy/docker-compose.yml run --rm vishnu migrate status
```

**Production — pre-built GHCR images**:

```bash
# On your build machine (builds linux/amd64, pushes to ghcr.io):
cd api && make push-api && make push-web
# or from web/: ./scripts/deploy-ghcr.sh

# On the server (repo checkout required):
git pull && ./api/deploy/deploy.sh
# pulls both images, runs migrations, force-recreates, health-checks
# /healthz through the web front, rolls back on failure
```

Images: `ghcr.io/<you>/vishnu-{api,web}` — set `VISHNU_API_TAG` /
`VISHNU_WEB_TAG` in `api/deploy/.env` to pin instead of float
`:latest`. Make the packages public (or log the server in to GHCR)
before first pull.

**Development** (postgres in docker, api + crush on the host):

```bash
bun install && bun run build   # shared-ui → contract → web
cd api
make db && make migrate        # postgres + schema
make dev                       # api on http://127.0.0.1:8080
```

The api serves no SPA — run `cd web && bun run dev` (Vite HMR on :5173,
proxies `/api` + `/p` to :8080 by default). Point the dev server at a
remote api instead by setting `VITE_API_UPSTREAM` — see
[`web/.env.example`](web/.env.example).

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
| `VISHNU_CRUSH_BIN` | `crush` | binary spawned for managed projects — the image bakes the fork at `/usr/local/bin/crush` |
| `VISHNU_PORT_START` | `9201` | first port probed upward for crush servers |
| `BREVO_API_KEY` / `BREVO_API_URL` / `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` | — / `https://api.brevo.com` / — / — | OTP email delivery — unset = codes logged to stdout |
| `VISHNU_BOOTSTRAP_EMAIL` | unset | first `admin` user, upserted at boot |
| `VISHNU_SESSION_TTL` | `720h` | auth session lifetime |
| `VISHNU_EMAIL_TIMEOUT` / `VISHNU_ENV` | `10s` / `development` | Brevo timeout / email subject prefix; `production` makes cookies `Secure` |

`api/deploy/.env` additionally carries compose-level values
(`VISHNU_HOST_PORT`, `VISHNU_API_PORT`, `VISHNU_API_UPSTREAM`, image
tags, crush config/data mounts) — see
[`api/deploy/.env.example`](api/deploy/.env.example).

## Security

Vishnu's agent can execute shell commands in every registered project —
treat the deployment like root on the host:

- Keep `VISHNU_LISTEN_ADDR` on loopback (the compose files already do);
  reach it over SSH tunnel, Tailscale, or your own TLS-terminating
  reverse proxy.
- Set `VISHNU_BOOTSTRAP_EMAIL` before exposing anything — sign-in is an
  email allowlist, not open registration.
- `BREVO_API_KEY` is required for OTP delivery beyond local dev.

## Commands

| Where | Command | Does |
| --- | --- | --- |
| root | `bun run build` / `bun run lint` | shared-ui → contract → web |
| `api/` | `make dev` · `make build` · `make test` · `make db` · `make migrate` | dev run, prod binary, tests, postgres, schema |
| `api/` | `make push-api` · `make push-web` · `make deploy` | build+push GHCR images, run `deploy/deploy.sh` |
| `web/` | `bun run dev` · `bun run build` · `bun run lint` | Vite HMR, prod build, oxlint |
| `contract/` | `bun run build` | tsc d.ts + bun build per domain entry |

## Status

Shipped and in daily use: multi-project registry, GitHub/local/remote
adds, per-project managed crush processes, session CRUD, streaming
chat with todos/plan rendering, permission + question prompts with
reconnect-safe replay and reconciliation, model/agent switcher,
email-OTP auth, production GHCR deploy pipeline.

The full system reference is [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md);
original design docs in [`docs/`](docs/PLAN.md).

## License

[MIT](LICENSE) for vishnu itself. The bundled `crush` binary is built
from a fork of [charmbracelet/crush](https://github.com/charmbracelet/crush),
which is [FSL-1.1-MIT](https://github.com/charmbracelet/crush/blob/main/LICENSE.md)
licensed by Charmbracelet, Inc. — the fork retains that license.
