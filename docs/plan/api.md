# api/ work plan — project registry + crush proxy + SPA host

## Scope

One Go module (`github.com/andikapradanaarif/vishnu`, module root at
`api/`) that does three things:

1. Serve the built `web/` SPA (embedded via `go:embed` for the single
   binary prod path, `VISHNU_WEB_DIR` override for disk).
2. Own a **project registry + process manager** — `/api/projects`
   CRUD, lazy-spawn/health-check one `crush server` per project
   (see `projects.md`).
3. Reverse-proxy `/p/{pid}/v1/*` to that project's crush upstream,
   streaming responses — the SSE endpoint must flush per event.
   Path-prefixed per project because `EventSource` can't set headers.

Brevo email service lives in `internal/service/email` (auth OTP
later).

## Layering (nexus-style)

```
cmd/server/main.go                     wiring + lifecycle
internal/config/config.go              env → Config
internal/service/upstream_service.go   net/http client + request builder
internal/service/email/                EmailService iface + brevo.go (OTP later)
internal/service/registry/             projects.json CRUD (id,name,path,mode,port)
internal/service/process/              crush lazy-spawn/health-check per project
internal/handler/proxy_handler.go      /p/{pid}/v1/* → project upstream (streaming)
internal/handler/project_handler.go    /api/projects* CRUD + ensure-running/workspace
internal/handler/web_handler.go        SPA static + index.html fallback
internal/webui/webui.go                //go:embed all:dist
internal/webui/dist/.gitkeep           placeholder so embed compiles pre-build
```

Config → services → handlers → routes in `main.go`; dependencies flow
downward via constructors, unexported impl structs behind exported
constructors.

## Config

| Env | Default | Purpose |
| --- | --- | --- |
| `VISHNU_LISTEN_ADDR` | `127.0.0.1:8080` | bind address (localhost default; LAN/Tailscale is deliberate opt-in) |
| `VISHNU_WEB_DIR` | unset → embed | serve SPA from disk instead of embedded `dist` |
| `VISHNU_DATA_DIR` | `~/.local/share/vishnu` | registry `projects.json` lives here |
| `VISHNU_PROJECTS_DIR` | `$VISHNU_DATA_DIR/projects` | where GitHub clones land |
| `VISHNU_CRUSH_BIN` | `crush` (`$PATH`) | binary spawned for managed projects |
| `VISHNU_PORT_START` | `9201` | first port probed upward for managed crushes |
| `BREVO_API_KEY` / `BREVO_API_URL` / `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` | — / `https://api.brevo.com` / — / — | transactional email (auth OTP, later) |
| `VISHNU_EMAIL_TIMEOUT` | `10s` | Brevo request timeout |
| `VISHNU_ENV` | `development` | prefixes email subjects outside prod |

## Proxy mechanics (the only non-trivial part)

- `app.All("/p/:pid/v1/*", proxy.Forward)` — catch-all, method-agnostic;
  `{pid}` resolves to a registry project's upstream (unknown → 404,
  project down → 502). The `/p/{pid}` prefix is stripped before
  forwarding so crush sees its native `/v1/*` shape.
- Request: `c.OriginalURL()` minus the prefix (path+query) appended to
  upstream base;
  headers copied minus hop-by-hop (`Connection`, `TE`,
  `Transfer-Encoding`, …) and `Accept-Encoding` (let net/http inject
  and transparently decode gzip).
- Response: status + headers copied minus hop-by-hop,
  `Content-Length`, `Content-Encoding` (body may have been
  decompressed); `X-Accel-Buffering: no` set.
- Body: `c.SendStreamWriter(fn)` — 32 KiB read loop with
  `w.Write` + `w.Flush()` per read → chunked transfer, each SSE event
  reaches the browser as published. Works for normal JSON too.
- Lifetime: `ctx, cancel := context.WithCancel(bg)`; `cancel` deferred
  inside the stream writer → upstream request dies when the response
  finishes or the browser disconnects. `client.Timeout` stays 0;
  dial timeout 5 s so a dead upstream 502s fast.

## Routes

| Route | Handler | Notes |
| --- | --- | --- |
| `GET /healthz` | inline | `{status}` |
| `GET/POST/DELETE /api/projects*` | ProjectHandler | registry CRUD + ensure-running/workspace |
| `ALL /p/:pid/v1/*` | ProxyHandler.Forward | strip prefix → per-project upstream, incl. SSE |
| `ALL /*` (fallback) | WebHandler.Handle | file → bytes; miss → index.html |

## Feature → endpoint mapping

| Feature | Endpoint |
| --- | --- |
| List/add/remove projects | `GET/POST/DELETE /api/projects` — add: `{repo_url}` (clone via `git ls-remote` check + async clone), `{name,path}` link local, `{name,upstream}` external |
| Select project → workspace | `GET /api/projects/{id}/workspace` (lazy-start managed crush + ensure workspace) |
| All crush calls below | under `/p/{pid}` — e.g. `/p/{pid}/v1/workspaces/{id}/sessions` |
| List sessions (title, busy, cost, updated) | `GET /v1/workspaces/{id}/sessions` |
| Create session | `POST /v1/workspaces/{id}/sessions` |
| Delete session | `DELETE /v1/workspaces/{id}/sessions/{sid}` |
| Message history | `GET /v1/workspaces/{id}/sessions/{sid}/messages` → `[]proto.Message` |
| Send prompt (detached run, survives reload) | `POST /v1/workspaces/{id}/agent` body `{session_id, prompt}` → 202 |
| Cancel a running turn | `POST /v1/workspaces/{id}/agent/sessions/{sid}/cancel` |
| Live stream | `GET /v1/workspaces/{id}/events?client_id=<uuid>` (SSE) |
| Report viewed session (scopes prompts) | `POST /v1/workspaces/{id}/current-session` |
| Permission grant | `POST /v1/workspaces/{id}/permissions/grant` `{permission, action}` (`allow`/`allow_session`/`deny`) |
| Skip-permissions toggle | `GET`/`POST /v1/workspaces/{id}/permissions/skip` `{skip}` |
| Question batch answer | `POST /v1/workspaces/{id}/questions/answer` + `/cancel` |
| Switch model | `GET …/agent` (`model_cfg`) + `GET …/providers` → `POST …/config/model` `{scope: 1, model_type, model: {model, provider}}` |
| Switch agent | `POST …/agent/main` `{agent_id}` (`coder`/`plan`/`task`) |
| Agent/busy state | `GET …/agent` → `AgentInfo{is_busy, is_ready, model, model_cfg}` |

## Crush wire notes

- SSE: `GET …/events?client_id=<id>` → `text/event-stream`; each event
  is `data: {type, payload}\n\n` flushed per publish
  (`internal/server/proto.go`). `client_id` is required. `message`
  events carry the **full `proto.Message` snapshot** — merge by id,
  no delta diffing.
- `POST …/agent` returns 202 — the run is detached server-side and
  survives the browser closing; the SSE stream is how output returns.
- Permission/question delivery is scoped to the client's reported
  session (`POST …/current-session?client_id=`); clients that never
  report get everything (fail-open).
- Workspace create takes `client_id` **in the JSON body**; other
  mutating endpoints take it as a `?client_id=` query param.

## SPA serving

`web_handler.go`: `fs.ReadFile(fsys, cleanPath)`; on miss →
`index.html`; `Content-Type` via `mime.TypeByExtension`. `fsys` is
`os.DirFS(VISHNU_WEB_DIR)` when set, else `webui.FS()`
(`//go:embed all:dist` → `fs.Sub`). Warn at boot when the embed has no
`index.html` (web not built yet).

## Build/run

```bash
make dev      # VISHNU_WEB_DIR=../web/dist go run cmd/server/main.go
make build    # bun build web → copy dist into webui → CGO_ENABLED=0 go build -o bin/vishnu-api
make test / lint / format / tidy
```

## Edge cases & checks

- **crush down**: `Forward` error → 502 `{message: "crush upstream unreachable"}`;
  SSE EventSource reconnects on its own (browser side).
- **crush restart mid-stream**: stream ends, `Body.Read` returns err →
  writer exits → cancel upstream req.
- **Big bodies**: `BodyLimit: 64MiB` on the Fiber app (prompts can
  carry file contents later).
- **Verify**: `go build ./...`, `go vet ./...`, `gofmt -l` clean.
  Manual: `curl -N localhost:8080/p/{pid}/v1/workspaces/{id}/events?client_id=…`
  shows events as they arrive; `curl localhost:8080/` returns the SPA;
  `curl localhost:8080/api/projects` lists the registry.
