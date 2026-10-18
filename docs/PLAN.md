# crush-web — personal web UI for crush sessions

## Goal

A web app that lets me drive `crush` from a browser: see the
session list, open a session, send prompts to the agent, and watch it
work — without the TUI. Personal tool, localhost only.

**No crush fork or patch needed**: every endpoint used
(sessions CRUD, `POST …/agent`, SSE `…/events`, `permissions/grant`,
`questions/answer`, `current-session`) exists verbatim in stock
upstream `charmbracelet/crush` — verified against upstream/main. The
app treats `crush server` as a black box; install the normal release
(`brew install crush` / `go install`) or reuse the fork build if its
memory features are wanted — both expose the same `/v1` surface this
app consumes.

## Why a proxy is needed

`crush server` already exposes the whole backend over HTTP
(`internal/server`, `internal/proto`): sessions, messages, agent runs,
permissions, questions, and an SSE event stream. Two gaps stop a
browser from talking to it directly:

1. **No CORS headers** — browser fetch/EventSource cross-origin is
   blocked. Adding CORS to crush's server is a fork patch we don't
   need; a same-origin proxy solves it cleanly.
2. **One origin for SSE** — the event stream is `GET
   /v1/workspaces/{id}/events` (SSE). Proxying it same-origin keeps
   `EventSource` trivial.

So the app is: **React SPA + thin proxy**. The proxy serves the
built frontend and forwards `/v1/*` (incl. SSE) to `crush server`.

```
browser ── http://127.0.0.1:8080 ──> proxy ──> crush server (tcp://127.0.0.1:9119
│        index.html, assets          │         or unix://~/.local/share/crush/crush.sock)
│        React SPA                   └─ /v1/* → reverse proxy (SSE passthrough)
```

## Stack (valo/nexus style)

The repo is a **bun-workspaces monorepo** in the same style as the
valo (`api/` + `backoffice/`) and nexus (`backend/` + `backoffice/`)
monorepos:

- **`web/`**: Vite + React 19 + TypeScript (strict). TanStack Query
  for server state, Tailwind v4 (`@tailwindcss/vite`), oxlint/oxfmt.
  Single page, no router — one screen is enough (sidebar = sessions,
  main = conversation). Hand-mirrored crush wire types in
  `src/types/crush.ts` (no contract package: the api owns no routes of
  its own, so there is nothing to generate a contract from). UI code is
  organized like valo's backoffice: `src/features/<domain>/` holds
  feature components; generic primitives come from `shared-ui`.
- **`shared-ui/`**: `@vishnu/ui-component` — vendored copy of nexus's
  `shared-ts` package (full component set, same layout and build
  conventions). Consumed via subpath imports
  (`@vishnu/ui-component/button`), styles via
  `@vishnu/ui-component/styles.css`. Self-contained — no coupling to
  the nexus repo after vendoring.
- **`api/`**: Go + Fiber v3, nexus-style layering
  (`cmd/server` → `internal/config` → `internal/service` →
  `internal/handler`). The `/v1/*` proxy streams responses via
  `SendStreamWriter` with a flush per read — SSE events arrive
  per-publish, same as `httputil.ReverseProxy`. Serves the embedded
  `web/dist` build in prod (env override `VISHNU_WEB_DIR` for dev).
  For UI iteration, Vite's dev-server proxies `/v1` straight to crush —
  no Go process needed.

Detailed work plans: [`plan/api.md`](plan/api.md) (API),
[`plan/web.md`](plan/web.md) (web frontend).

## Project layout

```
vishnu/
  docs/PLAN.md            this file
  docs/plan/api.md        API work plan
  docs/plan/web.md        web frontend work plan
  package.json            bun workspace root (web + shared-ui)
  api/                    Go module (github.com/andikapradanaarif/vishnu)
    cmd/server/main.go
    internal/config/config.go
    internal/service/upstream_service.go
    internal/handler/proxy_handler.go   /v1/* streaming proxy
    internal/handler/web_handler.go     SPA + index.html fallback
    internal/webui/                     go:embed dist/
    Makefile
  shared-ui/              @vishnu/ui-component — vendored nexus shared-ts
    ui-component/         one dir per component (<C>.tsx + type.ts)
    hooks/ utils/ types/ constants/
    index.ts styles.css scripts/build.sh
  web/                    Vite + React + TS
    index.html
    vite.config.ts        dev proxy: /v1 -> crush server
    src/App.tsx           shell: workspace pick, drawer, current-session
    src/types/crush.ts    wire types mirrored from crush proto
    src/services/         crushClient, queryClient, clientId, pendingStore
    src/hooks/            useCrushEvents (SSE dispatch), queries
    src/features/         sessions/ (sidebar), chat/ (pane, composer),
                          prompts/ (permission + question cards),
                          topbar/ (model & agent switcher)
```

## v1 features → API mapping

| Feature | Endpoint |
| --- | --- |
| List sessions (title, busy, cost, updated) | `GET /v1/workspaces/{id}/sessions` |
| Pick the one workspace | `GET /v1/workspaces` → use `[0]`; error state if several/none |
| Create session | `POST /v1/workspaces/{id}/sessions` |
| Delete session | `DELETE /v1/workspaces/{id}/sessions/{sid}` |
| Message history | `GET /v1/workspaces/{id}/sessions/{sid}/messages` → `[]proto.Message` |
| Send prompt (detached run, survives reload) | `POST /v1/workspaces/{id}/agent` body `{session_id, prompt}` → 202 |
| Cancel a running turn | `POST /v1/workspaces/{id}/agent/sessions/{sid}/cancel` |
| Live stream | `GET /v1/workspaces/{id}/events?client_id=<uuid>` (SSE) |
| Report viewed session (scopes prompts) | `POST /v1/workspaces/{id}/current-session` |
| Permission grant | `POST /v1/workspaces/{id}/permissions/grant` body `{permission, action}` (`allow`/`allow_session`/`deny`) |
| Skip-permissions toggle | `GET`/`POST /v1/workspaces/{id}/permissions/skip` `{skip}` |
| Question batch answer (question tool) | `POST /v1/workspaces/{id}/questions/answer` + `/cancel` |
| Switch model | `GET …/agent` (current `model_cfg`) + `GET …/providers` → `POST …/config/model` `{scope: 1, model_type, model: {model, provider}}` |
| Switch agent | `POST …/agent/main` `{agent_id}` (`coder`/`plan`/`task`) |
| Agent/busy state | `GET …/agent` → `AgentInfo{is_busy, is_ready, model, model_cfg}` |

## Why no WebSocket — the wire is already two half-channels

Chat looks bidirectional but isn't: prompts go **client→server** as
plain HTTP POSTs (`POST …/agent` returns 202 immediately — the run is
detached server-side and survives the browser closing entirely), and
agent output goes **server→client** over the SSE event stream. A
WebSocket would only add a second transport for the same flows; SSE
is plain HTTP/1.1, auto-reconnects (`EventSource` handles backoff),
survives proxies, and is what crush already emits.

Consequence that matters for phone use: because sends are detached
and receive is a reconnectable stream, **closing the browser or the
phone screen does not stop the agent** — reopening the page
re-fetches history and re-attaches the stream mid-run.

## Event stream handling

`GET …/events?client_id=<id>` is `text/event-stream` — headers flush
immediately, each event is `data: <json>\n\n` flushed per publish
(`internal/server/proto.go:177`). `client_id` is required.

Events carry a `pubsub.Payload` envelope — a `PayloadType`
discriminator + typed payload JSON. `message` events carry the **full
`proto.Message` snapshot** (id, role, parts, timestamps), so the UI
merges by message `id` — replace-by-id, no delta diffing. The UI
dispatches on:

- `message` — new/updated message parts (append/update the transcript;
  covers streamed assistant text + tool calls/results)
- `session` — session row updates (title, busy, cost → refresh list row)
- `agent_event` — run lifecycle (typing indicator)
- `permission_request` — render an Approve/Deny/Allow-for-session card
- `permission_notification` — clear the card when resolved
- `question_batch_request` / `question_batch_notification` — the
  question tool's prompt; render answer UI (same mechanism as
  permissions)
- `run_complete` — mark session idle, refresh token/cost display
- `config_changed`, `update_available` — toast/no-op

### Client identity (important detail)

The server scopes question/permission delivery to the session a
client is viewing: pass a stable `?client_id=` on the EventSource and
`POST /v1/workspaces/{id}/current-session` whenever the user opens a
session. Clients that never report get everything (fail-open), but
reporting keeps a second browser tab from answering another tab's
prompts.

## Answering the agent (questions + permissions)

The agent blocks on two request kinds; both arrive as SSE events and
are answered by POST:

**Permissions** — `permission_request` → `PermissionRequest{id,
session_id, tool_call_id, tool_name, description, action, params,
path}`. UI renders a card pinned above the composer: tool name,
description, the path/command if present, and three buttons —
**Allow** / **Allow for session** / **Deny** →
`POST …/permissions/grant {permission: <the request>, action}`.
`permission_notification` (granted/denied) dismisses the card — also
fires when another client answered it, so stale cards don't linger.

**Questions** (`question` tool batches) — `question_batch_request` →
`QuestionRequest{id, session_id, tool_call_id, questions[],
confirm_title}`. Each `QuestionItem{type, question, choices[]}` is a
select/multi-select/fill-in/yes-no field. UI renders a small form;
submit → `POST …/questions/answer {batch_request_id, responses:
[{request_id, selected_ids | fill_in_text | yes}]}`; a dismiss button
hits `POST …/questions/cancel`. `question_batch_notification` means
resolved elsewhere → dismiss the form.

Both are session-scoped: the server delivers them only to the client
that reported `current-session` — which is why the app registers a
`client_id` on the EventSource and POSTs `current-session` on open.

## Message rendering

`proto.Message` carries `Parts` — text, reasoning, tool calls (with
inputs), tool results, attachments. v1 renders: user text, assistant
text, reasoning (collapsible), tool call name + args summary +
result excerpt. Markdown via a tiny renderer (or `marked`) for
assistant text.

## Run flow

```bash
# terminal 1 — one crush server per project dir
cd <project> && crush server --host tcp://127.0.0.1:9119

# terminal 2 — web dev (vite proxies /v1 straight to :9119)
cd vishnu/web && bun i && bun run dev

# prod — single binary, web/dist embedded into api
cd vishnu/api && make build && ./bin/vishnu-api   # :8080
# env overrides: VISHNU_LISTEN_ADDR, VISHNU_CRUSH_UPSTREAM, VISHNU_WEB_DIR
```

Browser opens `http://127.0.0.1:8080`.

## Mobile support

Target: iPhone/Android browser, portrait-first.

- **Layout**: single column; session list becomes a slide-over drawer
  (hamburger) under ~768px; conversation is full-width; composer is a
  sticky bottom bar (above the keyboard).
- **Viewport/CSS**: `viewport-fit=cover` + `env(safe-area-inset-*)`
  for notch/home-indicator padding; `100dvh` (not `100vh`) for iOS
  chrome collapse; ≥44px touch targets; input font-size ≥16px so iOS
  doesn't zoom on focus; code blocks/tool outputs scroll horizontally.
- **PWA**: manifest + `display: standalone` + apple-touch-icon →
  "Add to Home Screen" gives a chromeless app-like window.
- **SSE on mobile**: EventSource works in mobile Safari/Chrome. iOS
  suspends JS when backgrounded — on resume the stream auto-reconnects
  and we re-fetch messages to catch up. Runs continue server-side
  meanwhile (detached POSTs), so nothing is lost — a permission card
  just sits waiting.
- **Notifications**: no push in v1 — a permission/question waits in
  the UI until you look. (Later: web-push needs a service worker +
  server-side push sender — only worth it if missed prompts annoy.)

## Reaching it from a phone

Localhost binding can't be reached by the phone — pick one:

- **Tailscale (recommended)**: laptop + phone on the tailnet, proxy
  binds the tailscale IP (or `tailscale serve` it). Encrypted, no
  auth needed beyond the tailnet, works off-wifi too.
- **LAN bind**: proxy binds `0.0.0.0` or the LAN IP — fine on a home
  network you trust, but *anyone on the network can drive the agent*.
  If LAN: add a cheap shared-token check in the proxy (one env var →
  required `?token=` cookie) as minimum insurance.
- SSH port-forward from the phone works too but is clunky.

## Security posture (personal tool)

- Default bind stays `127.0.0.1`; the LAN/Tailscale choice above is
  deliberate opt-in. If bound off-localhost, add the shared token —
  the API grants shell execution through the agent.
- Permission prompts render the tool name + summary of what's being
  asked — not raw JSON.

## Out of scope for v1

- Workspace picker beyond a `<select>` when several are reported (one
  crush server = one workspace normally)
- Plan-mode approval, queued-prompt management, slash commands,
  attachments upload, LSP/MCP panels, file tracker
- Auth/multi-user
- Message editing/regenerate

## Open questions

- [ ] Proxy in Go vs Node — defaulting Go (single binary, SSE-safe
      `ReverseProxy`, matches crush's toolchain)
- [ ] Whether `permissions skip` should be a v1 toggle
      (`GET/POST /v1/workspaces/{id}/permissions/skip`) or left to
      `crushrc` as today
- [ ] Attachments (file upload) — `AgentMessage.Attachments` exists;
      defer unless needed
- [ ] Does the proxy need to survive crush server restarts (retry
      EventSource with backoff — yes, EventSource auto-reconnects;
      proxy just 502s while server is down)
