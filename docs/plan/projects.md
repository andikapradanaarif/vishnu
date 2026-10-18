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
survive a restart). v1 storage: JSON file; DB later with the user model.

```jsonc
// $VISHNU_DATA_DIR/projects.json (default ~/.local/share/vishnu/)
[
  { "id": "…", "name": "vishnu", "path": "/abs/path",
    "mode": "managed", "port": 9201 },
  { "id": "…", "name": "other", "mode": "external",
    "upstream": "http://127.0.0.1:9400" }
]
```

- `managed` — api spawned `crush server --host tcp://127.0.0.1:<port>`
  with `cwd=path`; vishnu owns its lifecycle (pid in memory, not the
  registry file — re-detect on boot by health-checking the port).
- `external` — a crush the user runs themselves; vishnu never
  starts/stops it, just routes.

## Process manager (`internal/service/process/`)

- `Add`: `os.Stat` the path (must be an existing dir — `POST
  /workspaces` gives crush a foothold there), allocate a port
  (`VISHNU_PORT_START`, default `9201`, probe upward until free),
  `exec.Command(crushBin, "server", "--host", "tcp://127.0.0.1:port")`
  `Dir=path`, capture stdout/stderr to a ring buffer per project
  (diagnostics, later a logs view).
- `crushBin`: `VISHNU_CRUSH_BIN`, default `crush` from `$PATH`.
- Boot recovery: registry survives; pids don't. On startup,
  health-check managed projects (`GET /v1/health` on their port);
  dead → status `stopped`, user clicks start (auto-restart is a
  follow-up — don't surprise-spawn agent processes on vishnu boot).
- Shutdown: SIGTERM managed children on vishnu shutdown
  (`ShutdownWithContext` window); external untouched.
- `Stop`/`Start`/`Delete` per project — delete removes the registry
  entry after stopping; never deletes anything on disk.

## Routing — `/p/{pid}/v1/*`

Per-project upstream selection must live **in the path**, not a
header: `EventSource` can't set headers, and the SSE URL must route
to the right project.

```
browser ──> vishnu api
            ├─ /api/projects*        registry CRUD + start/stop
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
| `POST /api/projects` | `{name, path}` managed | `{name, upstream}` external |
| `DELETE /api/projects/{id}` | stop (managed) + remove |
| `POST /api/projects/{id}/start` `/stop` | lifecycle (managed only) |
| `GET /api/projects/{id}/workspace` | ensure-workspace: list upstream workspaces, match `path`, `POST /v1/workspaces` if missing → returns the `wid` the SPA needs |

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
  projects + status chip + start/stop), `AddProjectDialog` (name+path,
  or external URL tab).
- `App.tsx` — `useProjects()` gate: no project selected → picker;
  selected → `ensureWorkspace(pid)` → set `apiClient` baseUrl →
  existing session shell (all hooks already take `wid`).
- `TopBar` — project name + status dot replaces workspace path.
- `services/api.ts` — `projectsClient` on `/api`; crush clients get
  rebound when a project is selected.

## Status model

`up` (health check ok) / `down` (managed stopped or external
unreachable) / `starting`. Health = `GET {upstream}/v1/health` with a
short timeout, cached a few seconds — never proxy a dead upstream
into a hanging SSE.

## Follow-ups (not v1)

- Auto-restart managed crushes on vishnu boot (opt-in flag)
- Per-project logs view (ring buffer → SSE)
- DB-backed registry with the user model; per-user project ACLs
- Attach-mode for a crush TUI's server (same lock constraint — a TUI
  session and a web session on the same project can't coexist anyway)
