# api/ work plan — crush reverse proxy + SPA host

## Scope

One Go module (`github.com/andikapradanaarif/vishnu`, module root at
`api/`) that does exactly two things:

1. Serve the built `web/` SPA (embedded via `go:embed` for the single
   binary prod path, `VISHNU_WEB_DIR` override for disk).
2. Reverse-proxy all `/v1/*` traffic to `crush server`, streaming
   responses — the SSE endpoint must flush per event.

There are deliberately **no app-owned API routes** beyond `/healthz`:
crush's `/v1` surface is the API. If vishnu needs its own endpoints
later (auth token check, config), add `internal/handler/<ctx>` then.

## Layering (nexus-style)

```
cmd/server/main.go                     wiring + lifecycle
internal/config/config.go              env → Config
internal/service/upstream_service.go   net/http client + request builder
internal/handler/proxy_handler.go      /v1/* → upstream (streaming)
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
| `VISHNU_CRUSH_UPSTREAM` | `http://127.0.0.1:9119` | crush server base URL (http/https only, validated at boot) |
| `VISHNU_WEB_DIR` | unset → embed | serve SPA from disk instead of embedded `dist` |

## Proxy mechanics (the only non-trivial part)

- `app.All("/v1/*", proxy.Forward)` — catch-all, method-agnostic.
- Request: `c.OriginalURL()` (path+query) appended to upstream base;
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
| `GET /healthz` | inline | `{status, upstream}` |
| `ALL /v1/*` | ProxyHandler.Forward | full passthrough incl. SSE |
| `ALL /*` (fallback) | WebHandler.Handle | file → bytes; miss → index.html |

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
  Manual: `curl -N localhost:8080/v1/workspaces/{id}/events?client_id=…`
  shows events as they arrive; `curl localhost:8080/` returns the SPA.
