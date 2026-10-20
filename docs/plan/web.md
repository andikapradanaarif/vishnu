# web/ work plan — crush session UI

## Scope

Single-screen React SPA (no router): sign-in gate → project menu →
session shell. The shell keeps the session sidebar + conversation pane
+ composer, with agent-controlled cards for permissions/questions and
HUD controls for model/agent switching. Mobile portrait-first per the
main plan.

## Layout & files

```
shared-ui/                   @vishnu/ui-component — vendored copy of
  ui-component/              nexus shared-ts (button, input/select,
  hooks/ utils/ types/       drawer, dialog, popover, menu, tabs, chip,
  constants/ assets/         alert, emptyState, loadingAnimation, text,
  index.ts styles.css        tooltip, table, form, ... full set)
  scripts/build.sh           bun bundle → dist + tsc .d.ts; subpath exports
  package.json               deps: classnames, @iconify/react, dompurify,
                             slate*, qrcode.react; peers: react19, tailwind4,
                             @tanstack/react-form

web/
  package.json            react19, @tanstack/react-query, react-markdown,
                          remark-gfm, @fontsource/* (mono/display/logo),
                          @vishnu/api-contract, @vishnu/ui-component
                          (workspace:*); dev: vite8, ts, tailwind4,
                          oxlint/oxfmt
  vite.config.ts          plugins: react + tailwindcss; /api and /p →
                          http://127.0.0.1:8080 (dev proxy); alias @ → src
  tsconfig{,.app,.node}.json   nexus-style strict (verbatimModuleSyntax,
                          erasableSyntaxOnly, noUncheckedSideEffectImports)
  index.html              viewport-fit=cover, dark
  src/
    main.tsx              QueryClientProvider + crt-scanlines shell + App
    index.css             @import tailwind + fonts + shared-ui styles;
                          @theme palette/fonts/radii; CRT utilities; .md
    App.tsx               me → project → workspace → shell state machine;
                          binds the project clients, resets crush state
    services/clientId.ts  sessionStorage UUID — per-tab identity
    services/api.ts       /api control client (auth/projects/users) +
                          rebindable /p/{pid}/v1 crush clients
    services/queryClient.ts    global 401 re-check + 4xx no-retry
    services/pendingStore.ts   useSyncExternalStore: pending permission/question
                               + busy sessions + SSE connection state
    hooks/useCrushEvents.ts    EventSource lifecycle + payload dispatch
    hooks/queries.ts           useMe/Projects/ProjectWorkspace +
                               useSessions/Messages/AgentInfo/Providers/
                               PermissionsSkip + mutations
    utils/errors.ts       ApiError → "[code] message" labels
    features/             feature modules (valo backoffice convention)
      auth/LoginScreen.tsx     title screen: email → six-cell OTP
      projects/                ProjectPicker (menu + status + delete),
                               AddProjectDialog (GitHub | link | external),
                               ProjectStates (starting / error / external down)
      shell/AppShell.tsx       HUD + save slots + transcript + prompts +
                               composer; owns activeSessionId and
                               current-session reporting
      topbar/TopBar.tsx        project name + status LED, model select,
                               agent select, skip toggle, projects, menu
      sessions/SessionSidebar.tsx  SLOT rows, busy blink, new/delete session
      chat/ChatPane.tsx        transcript + auto-scroll + retry
      chat/MessageParts.tsx    per-part renderers (text/reasoning/tool_call/
                               tool_result/shell_command)
      chat/Markdown.tsx        react-markdown + remark-gfm
      chat/Composer.tsx        `>` prompt, autosize, Enter=send,
                               cancel-while-busy
      prompts/PermissionCard.tsx   P1 decision box; grant actions
      prompts/QuestionCard.tsx     typed dialog menu (yes_no/single/multi/free_text)
```

**Shared-UI usage**: primitives (`Button`, `Select`, `Drawer`, `Dialog`,
`Chip`, `Tooltip`, `EmptyState`, `LoadingDots`, `Text`, icons) come from
`@vishnu/ui-component/<subpath>` imports — never hand-rolled in
features. Global component styles via `@vishnu/ui-component/styles.css`
in `index.css`. Features own composition + crush-specific rendering
(message parts, prompt cards); nothing generic lives under `features/`.

## Data flow

```
REST (query)                    SSE (one stream per project/workspace)
─────────────                   ────────────────────────────────────────
useProjects()            ┌──►   EventSource(/p/{pid}/v1/.../events?client_id)
  → select project       │        onmessage: {type, payload}
  → ensureWorkspace(pid) │          (rebinds apiClient baseUrl to /p/{pid}/v1)
  → workspacesClient     │
useSessions(wid)         │          message   → merge into
useMessages(wid,sid)     │            ['messages', sid] cache by id
useAgentInfo(wid)        │          session   → update sessions row
useProviders(wid)        │          agent_event → busySessions[sid]
usePermissionsSkip(wid) ─┘          run_complete → busy off + invalidate
                                   permission_*  → pendingStore
                                   question_*    → pendingStore
                                   config_changed→ invalidate config/agent
```

- `sendPrompt` mutation POSTs `{session_id, prompt, run_id: uuid}`
  (202 = accepted; run survives page close). Optimistic busy flag.
- Opening a session: `setActiveSession` → effect POSTs
  `current-session?client_id` so permission/question events reach only
  this tab.

## Event stream handling

`message` events carry the **full `proto.Message` snapshot**, so the
UI merges by message `id` — replace-by-id, no delta diffing. Dispatch:

- `message` — new/updated message parts (streamed text, tool calls/results)
- `session` — session row updates (title, busy, cost → refresh list row)
- `agent_event` — run lifecycle (typing indicator)
- `permission_request` — render Approve/Deny/Allow-for-session card
- `permission_notification` — clear the card when resolved (incl. when
  another client answered — stale cards don't linger)
- `question_batch_request` / `question_batch_notification` — question
  tool's prompt; render answer UI / dismiss
- `run_complete` — mark session idle, invalidate messages + sessions
- `config_changed`, `update_available` — invalidate config/agent, no-op

### Client identity

Crush scopes permission/question delivery to the session a client
reported viewing: a stable `?client_id=` (per-tab UUID in
sessionStorage) rides the EventSource URL and every mutating POST via
the ApiClient `defaultQuery`; `POST …/current-session` fires on
session open. Clients that never report get everything (fail-open) —
reporting keeps a second tab from answering another tab's prompts.

## Answering the agent

The agent blocks on two request kinds; both arrive as SSE events and
are answered by POST:

**Permissions** — `permission_request` → `PermissionRequest{id,
session_id, tool_call_id, tool_name, description, action, params,
path}`. Card pinned above the composer: tool name, description,
path/command → **Allow** / **Allow for session** / **Deny** →
`POST …/permissions/grant {permission: <the request>, action}`.
`permission_notification` (granted/denied) dismisses the card.

**Questions** (`question` tool batches) — `question_batch_request` →
`QuestionRequest{id, session_id, tool_call_id, questions[],
confirm_title}`. Each `QuestionItem{type, question, choices[]}` is a
select/multi-select/fill-in/yes-no field. Submit →
`POST …/questions/answer {batch_request_id, responses: [{request_id,
selected_ids | fill_in_text | yes}]}`; Dismiss →
`POST …/questions/cancel`. `question_batch_notification` = resolved
elsewhere → dismiss the form.

## Component contracts

- **features/sessions/SessionSidebar** — rows from `useSessions`; busy
  dot from `is_busy`/busySessions; `+` creates (empty title — crush
  auto-titles); per-row delete behind `Dialog` confirm. On mobile the
  sidebar mounts inside shared `Drawer`.
- **features/chat/ChatPane** — merges `useMessages` data + SSE-updated
  cache; parts render in order: `text` → markdown (assistant) /
  whitespace-wrap (user); `reasoning` → collapsed "Thinking";
  `tool_call` → name + pretty-printed truncated `input`; `tool_result`
  → excerpt, `is_error` red; `shell_command` → `$ cmd` + output;
  `finish`, `image_url`, `binary` → minimal. Auto-scroll unless user
  scrolled up.
- **features/chat/Composer** — Enter sends (Shift+Enter newline),
  disabled while sending; while busy shows **Stop** → `cancelRun`.
- **features/prompts/PermissionCard** — renders `tool_name`,
  `description`, `path` + params preview (stringified, clamped).
  Buttons map to `PermissionAction` allow / allow_session / deny →
  `permissions/grant {permission: <whole request>, action}`.
- **features/prompts/QuestionCard** — builds `QuestionResponseItem[]`
  by question type: `yes_no`→bool buttons, `single_choice`→radio →
  `selected_ids:[id]`, `multi_choice`→checkboxes, `free_text`→input →
  `fill_in_text`. Submit → `questions/answer`; Dismiss →
  `questions/cancel`.
- **features/topbar/TopBar** — model `Select` groups
  `providers[].models[]` (`{provider:id, model:m.id}` → `config/model
  scope=1 type=large`); agent `Select` coder/plan/task → `agent/main`;
  skip toggle → `permissions/skip`; SSE `Chip` dot
  (open/connecting/closed).

## Message rendering

`proto.Message` carries `Parts` — v1 renders: user text, assistant
text (markdown via `react-markdown` + `remark-gfm`, no raw HTML),
reasoning (collapsible "Thinking"), tool call name + args summary +
result excerpt, `shell_command` as `$ cmd` + output, `is_error` in
red. Unknown part types degrade to a quiet one-liner.

## Mobile support

Target: iPhone/Android browser, portrait-first (post-v1 polish).

- **Layout**: single column; session list becomes a slide-over
  `Drawer` (hamburger) under ~768px; conversation full-width;
  composer is a sticky bottom bar (above the keyboard).
- **Viewport/CSS**: `viewport-fit=cover` + `env(safe-area-inset-*)`
  padding; `100dvh` (not `100vh`) for iOS chrome collapse; ≥44px
  touch targets; input font-size ≥16px (no iOS focus zoom); code
  blocks/tool outputs scroll horizontally.
- **PWA**: manifest + `display: standalone` + apple-touch-icon →
  chromeless "app" window.
- **SSE on mobile**: EventSource works in mobile Safari/Chrome. iOS
  suspends JS when backgrounded — on resume the stream reconnects and
  we re-fetch messages; runs continue server-side (detached POSTs),
  so nothing is lost — a permission card just sits waiting.
- **Notifications**: none — prompts wait in the UI. (Later: web-push
  needs a service worker + server-side sender.)

## Types note

Wire types come from `@vishnu/api-contract` (`types.ts` mirrors crush
proto exactly): messages carry `parts: [{type, data}]`; SSE envelope
is `{type, payload}`; `config.Scope` is an **int** on the wire
(0 global, 1 workspace — use `scope: 1`); question types are
`yes_no|single_choice|multi_choice|free_text`; permission actions
`allow|allow_session|deny`. Project registry types are vishnu-owned —
clearly marked in the contract.

## Styling

`index.css` imports `tailwindcss` + `@vishnu/ui-component/styles.css`
(the vendored library ships its own variables/theme). App-level tokens
override in `@theme`: dark palette, `h-dvh` root, `env(safe-area-*)`
padding on composer, `.md` markdown element styles (code, pre, lists,
tables), `.no-scrollbar` helper like nexus. Sidebar is a fixed column
≥768px, shared `Drawer` slide-over under it.

## Build order

`shared-ui` and `contract` must build before `web` resolves the
`@vishnu/*` subpath exports (they point at `dist/`). Root `build`
script: `shared-ui` → `contract` → `web` (`bun run build` at root).

## Verification

`bun i` at repo root → root `bun run build` (shared-ui → contract →
web). Manual dev flow: `./bin/vishnu-api` → add project → select →
create session, prompt, watch SSE merge live, approve a permission
card, switch model, reload mid-run → history + stream reattach.
Styling-only iteration: `bun run dev` with vite proxying `/v1` to a
hand-run `crush server`.
