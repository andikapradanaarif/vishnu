# web/ work plan — crush session UI

## Scope

Single-screen React SPA (no router): session sidebar + conversation
pane + composer, with agent-controlled cards for permissions/questions
and top-bar controls for model/agent switching. Mobile portrait-first
per the main plan.

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
                          remark-gfm, @vishnu/ui-component (workspace:*);
                          dev: vite8, ts, tailwind4, oxlint/oxfmt
  vite.config.ts          plugins: react + tailwindcss; /v1 → $VITE_CRUSH_UPSTREAM
                          (default http://127.0.0.1:9119); alias @ → src
  tsconfig{,.app,.node}.json   nexus-style strict (verbatimModuleSyntax,
                          erasableSyntaxOnly, noUncheckedSideEffectImports)
  index.html              viewport-fit=cover, dark
  src/
    main.tsx              QueryClientProvider + App
    index.css             @import "tailwindcss" + @vishnu/ui-component/styles.css
                          + .md markdown styles + safe-area helpers
    App.tsx               workspace pick → layout shell; owns activeSessionId,
                          current-session reporting, drawer state
    types/crush.ts        wire types mirrored from internal/proto+pubsub
    services/clientId.ts  sessionStorage UUID — per-tab identity
    services/crushClient.ts  fetch wrapper + ApiError + all endpoints
    services/queryClient.ts    4xx no-retry, 15s staleTime
    services/pendingStore.ts   useSyncExternalStore: pending permission/question
                               + busy sessions + SSE connection state
    hooks/useCrushEvents.ts    EventSource lifecycle + payload dispatch
    hooks/queries.ts           useWorkspaces/Sessions/Messages/AgentInfo/
                               Providers/PermissionsSkip + mutations
    features/             feature modules (valo backoffice convention)
      topbar/TopBar.tsx        workspace path, model select, agent select,
                               skip-permissions toggle, conn dot, hamburger
      sessions/SessionSidebar.tsx  list rows, new/delete session
      chat/ChatPane.tsx        transcript + auto-scroll
      chat/MessageParts.tsx    per-part renderers (text/reasoning/tool_call/
                               tool_result/shell_command)
      chat/Markdown.tsx        react-markdown + remark-gfm
      chat/Composer.tsx        autosize textarea, Enter=send, cancel-while-busy
      prompts/PermissionCard.tsx   tool, description, path; grant actions
      prompts/QuestionCard.tsx     typed form (yes_no/single/multi/free_text)
```

**Shared-UI usage**: primitives (`Button`, `Select`, `Drawer`, `Dialog`,
`Chip`, `Tooltip`, `EmptyState`, `LoadingDots`, `Text`, icons) come from
`@vishnu/ui-component/<subpath>` imports — never hand-rolled in
features. Global component styles via `@vishnu/ui-component/styles.css`
in `index.css`. Features own composition + crush-specific rendering
(message parts, prompt cards); nothing generic lives under `features/`.

## Data flow

```
REST (query)                    SSE (one stream per workspace)
─────────────                   ────────────────────────────────
useWorkspaces()          ┌──►   EventSource(.../events?client_id)
  → workspaces[0]        │        onmessage: {type, payload}
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

## Types note

`types/crush.ts` mirrors the wire exactly: messages carry
`parts: [{type, data}]`; SSE envelope is `{type, payload}`;
`config.Scope` is an **int** on the wire (0 global, 1 workspace — use
`scope: 1`); question types are `yes_no|single_choice|multi_choice|
free_text`; permission actions `allow|allow_session|deny`.

## Styling

`index.css` imports `tailwindcss` + `@vishnu/ui-component/styles.css`
(the vendored library ships its own variables/theme). App-level tokens
override in `@theme`: dark palette, `h-dvh` root, `env(safe-area-*)`
padding on composer, `.md` markdown element styles (code, pre, lists,
tables), `.no-scrollbar` helper like nexus. Sidebar is a fixed column
≥768px, shared `Drawer` slide-over under it.

## Build order

`shared-ui` must build before `web` resolves `@vishnu/ui-component`
subpaths (they point at `dist/`). Root `build` script:
`cd shared-ui && bun run build && cd ../web && bun run build`.

## Verification

`bun i` at repo root → `cd shared-ui && bun run build` → `cd ../web &&
bun run typecheck && bun run lint && bun run build`. Manual dev flow:
`crush server -H tcp://127.0.0.1:9119` + `bun run dev` → create
session, prompt, watch SSE merge live, approve a permission card,
switch model, reload mid-run → history + stream reattach.
