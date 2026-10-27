# Vishnu — Architecture

Current-state reference for the whole system. For the pitch/quickstart
see [`../README.md`](../README.md); for agent-facing conventions see
[`../AGENTS.md`](../AGENTS.md).

## Overview

Vishnu is a browser control plane for
[`crush server`](https://github.com/andikapradanaarif/crush) — Charm's
coding-agent runtime in headless HTTP/SSE mode. One deployment hosts
many projects; each project gets its own lazily-spawned `crush server`
child process, and the UI drives sessions, chat, permission/question
prompts, plan rendering, and model/agent switching against it.

Two independently deployable artifacts:

| Artifact | Image | Contents |
| --- | --- | --- |
| API | `vishnu-api` | Go binary (Fiber v3 + Postgres/GORM) + baked-in `crush` binary |
| Web | `vishnu-web` | nginx serving the static Vite/React SPA + reverse proxy |

They can share a host or live on separate servers/domains — the only
coupling is the web's `VISHNU_API_UPSTREAM` env pointing at the API.

```
browser ──> vishnu-web (nginx :80)
            │  static SPA          (GET /, assets)
            │  /api/*  ──────────> vishnu-api :8080  (auth, projects, users)
            │  /p/{pid}/v1/* ────> vishnu-api :8080 ──> crush child for {pid}
            │      SSE stream        (SendStreamWriter, no upstream timeout)
            ▼
        vishnu-api also owns:
          Postgres  (users, OTP codes, auth sessions, project registry)
          child mgr (crush server per project, tcp://127.0.0.1:9201+)
          cloner    (git clone for GitHub-sourced projects)
          mailer    (Brevo — sign-in OTPs)
```

## API service (`api/`)

Go module `github.com/andikapradanaarif/vishnu`, Fiber v3,
clean-architecture layering: `domain` → `repository` → `usecase` →
`handler`, with `service/` for external-world adapters and `dto/` for
wire shapes. Wiring lives in `cmd/server/main.go`.

### HTTP surface

| Route | Handler | Notes |
| --- | --- | --- |
| `GET /healthz` | inline | liveness — used by compose healthchecks and `deploy.sh` |
| `POST /api/auth/request-otp` | `auth_handler` | always 200 — no email enumeration; mails a 10-min, 5-try, single-use code via Brevo (logs it when unconfigured) |
| `POST /api/auth/verify` | `auth_handler` | sets `vishnu_session` cookie (HttpOnly, SameSite=Lax, Secure under `VISHNU_ENV=production`) |
| `POST /api/auth/logout` | `auth_handler` | revokes the session row |
| `GET /api/auth/me` | `auth_handler` | current user |
| `GET /api/projects` | `project_handler` | registry list |
| `POST /api/projects` | `project_handler` | three add modes — see below |
| `DELETE /api/projects/:id` | `project_handler` | stops the child, deletes the row — files on disk untouched |
| `GET /api/projects/:id/workspace` | `project_handler` | lazy-starts crush + resolves/creates the workspace id — the route loader calls this before rendering a project |
| `POST /api/users` | `user_handler` | admin-only user creation |
| `ALL /p/:pid/v1/*` | `proxy_handler` | reverse proxy to that project's crush upstream — includes the SSE stream |

Auth middleware (`middleware/auth.go`) gates every `/api/*` except
`/api/auth/*`, and is attached directly to the `/p/:pid/v1/*` route so
it cannot leak onto unrelated `/p…` paths.

### Project registry & add modes

`POST /api/projects` accepts three shapes (`usecase/project_usecase.go`):

| Mode | Fields | Behaviour |
| --- | --- | --- |
| `github` | `repo_url`, `name?` | `git ls-remote` access check → async clone into `VISHNU_PROJECTS_DIR` → status `cloning` → `ready`/`error` |
| `local` | `name`, `path` | `os.Stat`-validated directory, registered ready |
| `remote` | `name`, `upstream` | external crush server — routed, never spawned/stopped |

### Crush process manager (`internal/service/process`)

One `crush server --host tcp://127.0.0.1:<port>` child per managed
project, owned by the manager's lifetime — never tied to the request
that spawned it.

- `Ensure(project)` → upstream URL; spawns on first use, respawns after
  crashes/exits, waits up to `HealthTimeout` (15s, polling every 100ms)
  for `/healthz` before answering.
- Ports allocated upward from `VISHNU_PORT_START` (9201) skipping
  reserved/in-use ports; uniqueness also enforced by a DB constraint.
- Health results cached `HealthCacheTTL` (3s) to keep hot paths cheap.
- Per-child ring buffer keeps the last `LogLines` (1000) log lines.
- `StopTimeout` 5s SIGTERM → SIGKILL on shutdown.
- Children of remote projects are never spawned — `upstream` is used
  as-is.

### Proxy (`internal/handler/proxy_handler.go` + `internal/service/upstream_*`)

- `service.Proxy.Forward` rewrites `/p/{pid}/v1/...` → `{upstream}/v1/...`,
  forwards method/body/headers, streams the response back. SSE
  (`…/events`) uses `SendStreamWriter` with no upstream timeout;
  regular calls have a client timeout.
- **Agent auto-init**: when a sessions-list request
  (`/v1/workspaces/{id}/sessions`) arrives, `ensureAgent` fires
  `EnsureAgent` in the background — throttled to once per 30s per
  workspace (`agentInitRecheck`), so the polling SPA doesn't spam
  `GET /agent`. This is what lets a freshly-cloned project's "coder
  agent not initialized" state self-heal.
- `CrushClient` (`upstream_client.go`) is the typed client for control
  calls the API makes itself: `EnsureWorkspace` (lists workspaces,
  creates one bound to the project path when absent — a respawned
  child may answer under a fresh workspace id) and `EnsureAgent`.

### Auth model

- Users are an allowlist (`VISHNU_BOOTSTRAP_EMAIL` upserts the first
  admin at boot; `POST /api/users` adds more).
- OTP codes: 10-minute expiry, 5 wrong attempts max, single-use, mailed
  through Brevo (or logged when `BREVO_API_KEY` is unset — local dev).
- Auth sessions: stored hashed, sliding TTL (`VISHNU_SESSION_TTL`,
  720h default), revoked = row deleted.

### Persistence (Postgres)

Embedded SQL migrations under `api/migration/` (goose-style ordering in
`migrations_order.go`); the server applies pending migrations on boot
and exits with a fix-it message when Postgres is unreachable. Tables:

| Table | Contents |
| --- | --- |
| `users` | allowlist + role |
| `otp_codes` | hashed codes, attempts, expiry |
| `auth_sessions` | hashed session tokens, sliding expiry |
| `projects` | name, path/upstream, port, status, source mode |

Tests that need Postgres skip unless `VISHNU_TEST_DB_DSN` is set.

## Web (`web/`)

Vite + React 19 + strict TypeScript. TanStack Router (file-based
routes), TanStack Query for server state, Tailwind v4 + a vendored
component library (`@vishnu/ui-component` from `shared-ui/`). No SSR —
it's a static SPA; nginx serves it and proxies `/api` + `/p` to the API
(`web/nginx.conf.template`, `VISHNU_API_UPSTREAM`).

### Routes

| Path | Screen |
| --- | --- |
| `/login` | email + OTP sign-in |
| `/projects` | project picker (add/delete dialogs) |
| `/projects/$projectId` | project home — session sidebar + empty composer |
| `/projects/$projectId/sessions/$sessionId` | a room: transcript + composer |

Route loaders call `GET /api/projects/:id/workspace` (`staleTime: 0`) so
the workspace id is always fresh — a respawned crush child answers under
a new id, and a stale cached id self-heals via SSE-error →
`router.invalidate()` plus a 5s auto-retry on the route error screen.

### Feature map (`src/features/`)

| Module | What it is |
| --- | --- |
| `shell/` | `AppShell` (sidebar+topbar layout), `SessionView` (room; reports current-session + reconciles pending), `ProjectHome` |
| `chat/` | `ChatPane` (transcript, live plan card, pending cards, conn banner), `Composer` (prompt box, slash-command menu, stop button), `MessageParts` (part renderers: text, reasoning, tool calls/results, file edits), `Markdown`, `TodoList` |
| `prompts/` | `PermissionCard`, `QuestionCard` — interactive prompt UI |
| `sessions/` | `SessionSidebar` — list, new, rename, delete (with confirm dialog) |
| `projects/` | `ProjectPicker`, `AddProjectDialog` (GitHub/Link/Remote tabs), states |
| `settings/` | `SettingsDialog` — permission skip toggle etc. |
| `topbar/` | `TopBar`, `ProjectSwitcher`, `AgentModelControls` |
| `auth/` | `LoginScreen` |

### Client-side state model

Three layers, deliberately separate:

1. **TanStack Query** — server state (sessions, messages, agent, config,
   pending permissions). SSE dispatch writes into the cache via
   `setQueryData` for messages/sessions and invalidates the rest.
2. **`pendingStore`** (`services/pendingStore.ts`, `useSyncExternalStore`)
   — ephemeral event state that isn't a query: pending permission/question
   cards, optimistic `busy` flags per session, SSE conn state.
3. **`useCrushEvents`** — the single workspace SSE subscription
   (`/p/{pid}/v1/workspaces/{id}/events?client_id=…`), fanning events to
   both layers; `EventSource` auto-reconnects, `onopen` invalidates
   messages/sessions/pending queries for catch-up.

Busy-flag correctness: `reconcileBusy` folds server `is_busy` (sessions
list) over the optimistic map every refresh — a `run_complete` missed
while disconnected can't stick the spinner.

### Pending prompt lifecycle (reconnect-safe)

- Prompts arrive as SSE `permission_request` / `question_batch_request`
  → added to `pendingStore`; resolved by
  `permission_notification{granted|denied}` /
  `question_batch_notification`.
- A raise-notification (`granted:false, denied:false`) is **not** a
  resolution — cards ignore it.
- Server truth endpoint `GET /v1/workspaces/{id}/sessions/{sid}/permissions/pending`
  (crush #417) is queried per viewed room; `reconcilePermissions` drops
  zombie cards under the session tree (session + descendants via
  `parent_session_id`) while leaving other rooms' cards alone.
  Refetches on mount, window focus, and every SSE `onopen`.
- `SessionView` `POST`s `current-session` on mount — server-side this
  scopes prompt delivery to the tab and triggers
  `republishPendingPrompts` (live requests re-emitted).
- `grant` answering `{resolved:false}` = dead waiter: card clears, and
  sessions/messages invalidate so `is_busy` reconcile drops the dead
  spinner; transport errors render on the card itself.

### API clients (`src/services/api.ts`)

- `controlClient` → `/api` (auth, projects, users) — no `client_id`.
- Per-domain crush clients bound to `/p/{pid}/v1`, rebound when the
  selected project changes; `client_id` (a per-tab uuid,
  `services/clientId.ts`) rides as `defaultQuery` so the server scopes
  prompt delivery.
- All fetches use `credentials: "include"` — same-origin cookie today,
  cross-origin deployment tomorrow.

## Contract (`contract/`)

`@vishnu/api-contract` — the crush `/v1` wire types + typed SDK clients
the web consumes (and any other TS consumer could):

```
src/
  client.ts       ApiClient: baseUrl + defaultQuery (client_id) + fetch
  paths.ts        all /v1 path templates ({id},{sid} placeholders)
  types.ts        shared wire types (Session, Message, PermissionRequest, …)
  <domain>/{sdk,index}.ts   agent, auth, config, events, permissions,
                            projects, questions, sessions, users, workspaces
```

Built with `bun run build` (tsc declarations + bun build per entry);
consumed as a workspace dependency with subpath exports
(`@vishnu/api-contract/agent`, …).

## shared-ui (`shared-ui/`)

Vendored React component library (`@vishnu/ui-component`) — Dialog
(portal, `containerClassName` controls width because the outer flex
item shrink-wraps), Tabs, Button, Input, etc. Web consumes its built
`dist/`, so `cd shared-ui && bun run build` after edits.

## The crush fork

`api/Dockerfile` builds `crush` from a pinned commit of
`andikapradanaarif/crush` (`CRUSH_REF` + `CRUSH_VERSION` args — bump
both together). The fork keeps upstream's module path and adds
server-mode features vishnu depends on:

- multi-pending permission tracking + `…/permissions/pending` list
  endpoint + replay-all on session report (#417)
- per-session permission skip with SSE propagation (#416)
- fork-only `crushrc` option keys (memory/notebook/turn-context knobs —
  upstream fails hard on them)

**The fork is the supported engine** — `VISHNU_CRUSH_BIN` must point
at a fork build; upstream is not a drop-in (missing endpoints, config
hard-fail).

## Deployment

### Images

- `api/Dockerfile` (repo-root context): Go build stage → fetch pinned
  fork SHA (`git fetch --depth 1` + `-buildvcs=false` so the ldflags
  version wins) → alpine runtime with `git`, GitHub `ssh_known_hosts`
  baked at `/etc/ssh/ssh_known_hosts`, `/data` volume for the registry
  + clones.
- `web/Dockerfile`: bun build shared-ui → contract → web → nginx
  serving `dist` with `nginx.conf.template` (`VISHNU_API_UPSTREAM`
  templated at container start).

### Compose

| File | Use |
| --- | --- |
| `api/deploy/docker-compose.yml` | local/dev stack — builds both images, postgres + api + web |
| `api/deploy/docker-compose.prod.yml` | prod — pulls GHCR images; loopback-published ports; mounts `~/.ssh` (ro), crush config/data dirs, `vishnu-data` volume |

### GHCR flow

`api/scripts/deploy-ghcr.sh` + `web/scripts/deploy-ghcr.sh`
(`make push-api` / `make push-web`): linux/amd64 build, tag
`ghcr.io/<owner>/vishnu-{api,web}:latest`, interactive `docker login`
(PAT, `write:packages`), push. Tags overridable via `VISHNU_API_TAG` /
`VISHNU_WEB_TAG` in `deploy/.env`.

`deploy/deploy.sh` (server): `git pull` → `docker compose pull` →
migrate → `up -d --force-recreate` (required — re-pulled `:latest`
keeps the old image otherwise) → `/healthz` through the web front →
automatic rollback on failure (also `--force-recreate`).

### Runtime env (api)

| Env | Default | Purpose |
| --- | --- | --- |
| `VISHNU_LISTEN_ADDR` | `127.0.0.1:8080` | bind — loopback outside the container |
| `DB_HOST/PORT/NAME/USER/PASS/SSL_MODE` | `127.0.0.1`/`5432`/`vishnu`/`vishnu`/—/`disable` | Postgres |
| `VISHNU_DATA_DIR` | `~/.local/share/vishnu` | runtime data root |
| `VISHNU_PROJECTS_DIR` | `$VISHNU_DATA_DIR/projects` | clone destination |
| `VISHNU_CRUSH_BIN` | `crush` | child binary (image: `/usr/local/bin/crush`) |
| `VISHNU_PORT_START` | `9201` | first child port |
| `VISHNU_BOOTSTRAP_EMAIL` | unset | first admin, upserted at boot |
| `VISHNU_SESSION_TTL` | `720h` | auth session life |
| `BREVO_API_KEY`/`API_URL`/`FROM_EMAIL`/`FROM_NAME` | —/`api.brevo.com`/—/— | OTP delivery; unset → codes logged |
| `VISHNU_EMAIL_TIMEOUT` / `VISHNU_ENV` | `10s`/`development` | mail timeout / `production`→Secure cookies |
| `VISHNU_TEST_DB_DSN` | unset | enables repository tests |

Compose-level (`api/deploy/.env`): `VISHNU_HOST_PORT` (web publish),
`VISHNU_API_PORT` (api publish), `VISHNU_API_UPSTREAM`, `VISHNU_SSH_DIR`,
`VISHNU_CRUSH_CONFIG_DIR`, `VISHNU_CRUSH_DATA_DIR`, `VISHNU_API_TAG`,
`VISHNU_WEB_TAG`, `DB_*`.

## Security model

- The agent executes shell commands in project dirs — deployment is
  effectively root on the host. Ports publish to `127.0.0.1` only;
  remote access via SSH tunnel, Tailscale, or an external TLS proxy.
- `EventSource` can't send headers → project routing and `client_id`
  live in the URL; auth rides on the HttpOnly cookie.
- OTP flow can't enumerate users (uniform 200s); cookies go `Secure`
  under `VISHNU_ENV=production`.
- GitHub SSH host keys baked into the image — no dependence on host
  `known_hosts`; git creds mounted read-only.

## Development workflow

```bash
bun install && bun run build        # shared-ui → contract → web
cd api && make db && make migrate   # postgres + schema
make dev                            # api on :8080 (reads api/.env)
cd web && bun run dev               # SPA on :5173, proxies to :8080
                                  # (VITE_API_UPSTREAM for a remote api)
```

Gates: `make test` + `make lint` (api), `tsc -b && oxlint .` (web),
`bun run lint` (contract). Style: gofumpt→goimports, slog capitalized,
JSON snake_case; oxlint/oxfmt for TS; semantic commits.
