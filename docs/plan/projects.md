# projects/ work plan — multi-project isolation

Status: **decided** — supersedes the "one crush server, pick `[0]`"
assumption in the main plan.

## Why per-project crush servers

A crush workspace already isolates state per path — sessions and
memory (referent/command-failure) live in the workspace's own `.crush/`
sqlite DB. But running all projects as workspaces on **one** shared
server is still wrong for this use case:

- **Data-dir lock** — crush locks `.crush/` against a second process
  (`internal/db`, `ErrDataDirLocked`). A shared server holding a
  workspace on project X blocks opening a crush TUI in project X
  (and vice versa). With several active projects this bites daily.
- **Blast radius** — one workspace's crash or runaway LSP takes the
  whole server down; per-process servers fail independently.
- **Lifecycle** — stop project A's agent while project B keeps working.

So: **one `crush server` process per project**, managed by vishnu.

## Registry

vishnu owns a registry of projects — crush has none (workspaces don't
survive a restart). Storage is **Postgres** — the `projects` table is
the first migration; schema and the `domain.ProjectRepository`
interface are defined in `data.md`. Columns map 1:1 to the record
below.

```jsonc
// one row per project
{
  "id": "…", "name": "vishnu", "path": "/abs/path",
  "mode": "managed", "port": 9201, "repo_url": "…",
  "status": "ready", "error": ""
}
// persisted status: cloning | ready | error
// merged runtime status at read time: down | starting | up | cloning | error
// repo_url: only for github-cloned projects
```

- `managed` — api spawned `crush server --host tcp://127.0.0.1:<port>`
  with `cwd=path`; vishnu owns its lifecycle. Pid/live state is
  in-memory in the process manager — the row only persists what
  survives a restart (no `up`/`starting` writes).
- `external` — a crush the user runs themselves; vishnu never
  starts/stops it, just routes.
- Dedupe is enforced by unique partial indexes on `path`, `repo_url`,
  `upstream` (see `data.md`) — repository surfaces a conflict sentinel
  the usecase maps to 409.

## Adding a project — three modes

`POST /api/projects` accepts:

1. **Clone from GitHub** — `{name?, repo_url}`:
   - Normalize (`owner/repo`, `https://github.com/o/r(.git)?`,
     `git@github.com:o/r(.git)?` all accepted).
   - **Eligibility**: `git ls-remote <url> HEAD` (short timeout) —
     uses the machine's real git auth (ssh agent, credential helper,
     `gh auth`), so private repos the user can access pass, others
     fail fast → `403 {message:"repository unreachable — check access"}`.
     (`git ls-remote` over `gh repo view`: `gh` may not be installed;
     `ls-remote` is the portable minimum.)
   - Name: repo slug last segment unless provided; dir =
     `VISHNU_PROJECTS_DIR/<name>` (default `$VISHNU_DATA_DIR/projects`),
     `-2` suffix on collision. Reject if a project already claims the
     same `path` or `repo_url`.
   - Insert row with `status: cloning` → **async `git clone`** in the
     background (202 returns immediately — a fat clone must not block
     the request); success → `ready` (crush lazy-spawns on
     first select); fail → `error` + message (retry/delete offered).
2. **Link local path** — `{name, path}`: `os.Stat` the dir must exist.
   For repos already on disk — cloning a second copy would fight over
   the same `.crush/` lock anyway.
3. **External server** — `{name, upstream}`: route-only as before.

**Delete** stays registry-only: stop the managed crush, soft-delete the
row — the cloned dir is left on disk (the UI delete-confirm says so;
a "also remove files" option is a later nicety, never default).

## Process manager (`internal/service/process/`)

Lifecycle is deliberately minimal — **create, delete, lazy-start**:

- `Add`: `os.Stat` the path (must be an existing dir — `POST
  /workspaces` gives crush a foothold there), allocate a port
  (`VISHNU_PORT_START`, default `9201`, probe upward until free),
  register the project. Nothing spawns yet. (GitHub-cloned projects
  get `path` + port assigned after the clone finishes.)
- **Lazy start on select**: `GET /api/projects/{id}/workspace` (or any
  `/p/{pid}` proxy hit) first ensures the managed crush is alive —
  health-check the port, `exec.Command(crushBin, "server", "--host",
  "tcp://127.0.0.1:port")` `Dir=path` if dead, wait for `/v1/health`
  before forwarding. This single code path covers first use, vishnu
  restarts, and crash respawn — no explicit start action needed.
  stdout/stderr → ring buffer per project (diagnostics, logs view
  later).
- `crushBin`: `VISHNU_CRUSH_BIN`, default `crush` from `$PATH`.
- `Delete`: SIGTERM the managed child, remove the registry entry.
  Never deletes anything on disk.
- Shutdown: SIGTERM all managed children on vishnu shutdown
  (`ShutdownWithContext` window); external untouched.
- No `start`/`stop` endpoints: a managed project is "running"
  whenever it's selected. (If keeping idle-but-registered projects
  parked matters later, a "park" action is a nicety — not v1.)

## Routing — `/p/{pid}/v1/*`

Per-project upstream selection must live **in the path**, not a
header: `EventSource` can't set headers, and the SSE URL must route
to the right project.

```
browser ──> vishnu api
            ├─ /api/projects*        registry CRUD + lazy-start
            ├─ /p/{pid}/v1/*         strip prefix → proxy to project's upstream
            └─ /*                    SPA
```

`proxy_handler` resolves `{pid}` → upstream from the registry;
unknown/stopped → 404/502. The streaming mechanics (SendStreamWriter,
flush-per-read) are unchanged — only upstream lookup is per-request.

## API routes (vishnu-owned, not proxied)

| Route | Purpose |
| --- | --- |
| `GET /api/projects` | list registry + live status (up/down, port) |
| `POST /api/projects` | `{name?, repo_url}` clone | `{name, path}` link local | `{name, upstream}` external |
| `DELETE /api/projects/{id}` | stop (managed) + remove |
| `GET /api/projects/{id}/workspace` | ensure-running (lazy start) + ensure-workspace: list upstream workspaces, match `path`, `POST /v1/workspaces` if missing → returns the `wid` the SPA needs |

After select, all crush calls keep their existing `/v1` shape —
just under `/p/{pid}`: `/p/{pid}/v1/workspaces/{wid}/sessions`, etc.

## contract/ changes

- `ApiClient`: `baseUrl` becomes settable (`setBaseUrl`) or clients are
  rebuilt per project — baseUrl = `/p/{pid}/v1`.
- New `projects` domain: `ProjectsClient` on a separate `baseUrl:"/api"`
  client (registry types in `types.ts` under a vishnu-owned section —
  these are OUR routes, not crush's; keep them clearly marked).

## web/ changes

- `features/projects/` — `ProjectPicker` (cards/table of registered
  projects + status dot + delete), `AddProjectDialog` with three tabs:
  **Clone from GitHub** (repo URL + optional name), **Link local
  path**, **External server** (upstream URL).
- `App.tsx` — `useProjects()` gate: no project selected → picker;
  selected → `ensureWorkspace(pid)` → set `apiClient` baseUrl →
  existing session shell (all hooks already take `wid`).
- `TopBar` — project name + status dot replaces workspace path.
- `services/api.ts` — `projectsClient` on `/api`; crush clients get
  rebound when a project is selected.

## Status model

Persisted in the row: `cloning` | `ready` | `error` (clone failed —
`error` carries the message). Computed by the process manager and
merged at read time: `up` (health check ok) / `down` (managed not yet
spawned or external unreachable) / `starting` (spawned, health check
pending). Health = `GET {upstream}/v1/health` with a short timeout,
cached a few seconds — never proxy a dead upstream into a hanging SSE;
a dead managed project respawns lazily on next use.

## Follow-ups (not v1)

- "Park" action (keep registered, deliberately stopped)
- Per-project logs view (ring buffer → SSE)
- Per-user project ACLs (with the auth milestone's user model)
- Attach-mode for a crush TUI's server (same lock constraint — a TUI
  session and a web session on the same project can't coexist anyway)
