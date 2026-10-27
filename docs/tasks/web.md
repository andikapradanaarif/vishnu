# web/ implementation — agent task breakdown

Assignee: rewire `web/` onto the shipped API + contract, and rebuild the
UI in the **vishnu retro-game theme**. Work is split into **5 PR-sized
milestones** (one in `shared-ui/`, four in `web/`) — land them in order;
each PR must lint, typecheck and build clean. Commit per topic.

Canonical docs: `docs/PLAN.md` (grand), `plan/web.md` (layout + data
flow + event dispatch), `plan/projects.md` (project lifecycle + status
model), `plan/api.md` (routes). SDK reference: `contract/` (merged —
`docs/tasks/contract.md` describes it). When doc and code disagree,
the merged code wins.

## The product today

`web/` is the v1 scaffold: single-workspace chat over `/v1` — session
sidebar, chat pane, composer, permission/question cards, topbar with
model/agent/skip controls. It predates auth and multi-project. This
task adds auth + project flows, rebinds every call through the new
contract, and reskins everything.

## Auth model (cookie sessions)

Vishnu signs in like a backoffice cookie session, not JWT-in-storage:

- The session token lives in an **HttpOnly cookie** (`vishnu_session`)
  — JS never sees or stores a token. No `localStorage`/`sessionStorage`
  auth state, no `Authorization` header plumbing.
- `ApiClient` uses `credentials: "include"` (same-origin anyway, but
  declare it for dev proxy parity — check how the contract client
  sets it and match the reference repo's `contract/src/client.ts`).
- Auth state = `useMe()` → `GET /api/auth/me` query. Signed-in user
  comes from the query cache; there is no auth context/store to
  duplicate.
- A **401 `ApiError`** on any call means the session died: invalidate
  `["auth","me"]`, which flips the gate back to `<LoginScreen/>`.
  Do not attempt refresh — vishnu sessions slide on activity, they
  don't refresh.
- Logout = `authClient.logout()` → clear the `me` cache → gate.
- `EventSource` for the SSE stream authenticates with the same cookie
  automatically — no query-param tokens, ever.

## Screens & flows (spec)

The app is a single-page state machine: `me` → `project` →
`workspace` → shell. Each screen below lists its states, the API calls
behind it, and the edge cases that must be handled.

### S0 — Title screen (login)

Route: unauthenticated `useMe` → render instead of the app.

- **Layout**: centered cabinet. VISHNU wordmark (pixel font), tagline,
  then a single-step form. Two phases on one screen, not a wizard.
- **Phase A — email**: `Input` + `CONTINUE`. Submit →
  `POST /api/auth/request-otp` (always 200; never say "this address
  isn't registered"). On success → Phase B; the email stays visible,
  dimmed, with an edit affordance.
- **Phase B — code**: 6-segment OTP input (monospace, one char per
  cell, auto-advance, paste-a-6-digit-string fills all) + `SIGN IN` +
  `RESEND` (disabled behind a 60 s countdown shown as `RESEND (42)`).
  Submit → `POST /api/auth/verify` → on success `setQueryData(["auth",
  "me"], user)` — no reload.
- **Errors** (inline under the field, `ApiError.code`): `invalid_code`
  → "wrong code", `code_expired` → "expired — request a new one",
  `too_many_attempts` → "locked out — request a new code",
  `invalid_email` → field error on Phase A.
- **Edge**: verify while unauthenticated cookie race — fine, cookie is
  set by response. A request-otp failure (network) shows a generic
  retry banner.

### S1 — Main menu (project picker)

Route: authenticated, no project selected. Also reachable later via a
"PROJECTS" affordance in the topbar (switching projects tears down the
shell).

- **Layout**: `SELECT PROJECT` heading, menu list — one row per
  project: `▸` pointer on hover/selected, name, mode chip
  (`MANAGED`/`EXT`), status chip (colored per the status map), `path`/
  `upstream` as the dim secondary line, and a `DEL` glyph button.
  Footer row: `+ NEW PROJECT`.
- **Data**: `useProjects()` → `GET /api/projects`. Selecting a managed
  project calls `useProjectWorkspace(id)` →
  `GET /api/projects/{id}/workspace`, which lazily spawns crush — show
  an inline `STARTING…` state on that row while the call is in flight
  (it can take seconds on a cold spawn).
- **Row states**: `cloning` → animated busy chip + refetch the
  projects query every ~2 s until the row flips to ready/error (clone
  is async — the row can't be entered yet). Note: `ProjectsClient`
  has no `get(id)` — poll `list()` and re-derive the row, or add the
  method to the contract as a separate small PR (the API route
  `GET /api/projects/{id}` exists). `error` → show the stored
  error text on a second line + `RETRY` is implicitly delete-and-
  re-add. `down` (external unreachable, reported at read) → row is
  dimmed; entering it shows the external-down screen instead.
- **Delete**: confirm dialog ("Delete {name}? Crush is stopped for
  managed projects. Files on disk are not touched.") →
  `DELETE /api/projects/{id}` → row removed; if it was the selected
  project, fall back to the menu.
- **Add project** (`AddProjectDialog`, three tabs, exactly one source
  per submit — `dto.CreateProjectRequest`):
  - **GitHub**: `repo_url` field — accepts `owner/repo`,
    `https://github.com/…`, `git@…`, trailing `/` and `.git` are fine.
    Helper copy: "Access is checked on the server first." 403 →
    "server can't reach that repo — check its git auth". Success →
    row appears as `cloning`.
  - **Link**: absolute `path` field. 400/`invalid_path` →
    "directory not found on the server".
  - **External**: `upstream` field — `http(s)://host:port` where a
    crush server is already running. Note in copy: "vishnu routes to
    it; it never starts or stops it."
  - Shared: optional `name` (defaults to repo slug / dir basename);
    409 → "already registered".
- **Empty state**: no projects → "INSERT COIN" — big `+ NEW PROJECT`
  as the only action.

### S2 — The shell (session HUD)

Route: project selected + workspace ensured. Layout persists across
everything below.

- **Topbar (HUD)**: left — project name + status LED (● `ONLINE` ok /
  `STARTING` warn-blink / `OFFLINE` ghost, driven by `pendingStore`
  SSE conn state). Center/right — `MODEL` select chip, `AGENT` select
  chip, `SKIP` toggle (permissions-skip), hamburger → drawer menu
  (sessions on mobile, `SWITCH PROJECT`, `LOG OUT`).
- **Sidebar (save slots)**: `SESSIONS` header + `+` button. Rows:
  `SLOT n` / session title / relative `updated_at` / busy indicator
  (blinking block while that session's agent runs — sessions are busy
  independently). `DELETE` per row (icon, confirm inline or dialog).
  Selecting a row = switch session; `+` → `POST sessions` → select it.
- **Chat pane**: transcript, auto-scroll to bottom on new content
  unless the user scrolled up (follow-tail behavior). Per-message
  parts render in order (see S4).
- **Composer**: bottom strip, `>` prompt glyph + autosize textarea.
  Enter sends, Shift+Enter newline. While the session is busy the
  send button becomes `■ STOP` →
  `POST agent/sessions/{id}/cancel`; the textarea stays enabled so the
  user can queue their next message.
- **Sessions API**: `useSessions(wid)` list, `useCreateSession`,
  `useDeleteSession`, messages via `useMessages(wid, sid)`.

### S3 — Chat & streaming

- **REST**: messages load via `GET …/sessions/{id}/messages` (query
  cache keyed `[messages, wid, sid]`).
- **SSE**: one `EventSource` per workspace —
  `eventsClient.url(wid)` = `/p/{pid}/v1/workspaces/{wid}/events?
  client_id=…`. Lives in `useCrushEvents(wid)`; `EventSource` auto-
  reconnects (conn state → the topbar LED).
- **Dispatch** (`{type, payload}` envelope → query cache +
  `pendingStore`):
  - `message` → merge/replace by id into the messages cache (a message
    is a full snapshot — later events overwrite it); mark session busy.
  - `session` → merge into the sessions list (title/busy changes).
  - `agent_event` → busy state per `session_id` (`done`/`error`
    clears, else sets).
  - `permission_request` → push to pending permissions (S5).
  - `permission_notification` → remove by `tool_call_id`.
  - `question_batch_request` → push pending question (S6).
  - `question_batch_notification` → remove by `batch_id`.
  - `run_complete` → clear busy, invalidate messages + sessions.
  - `config_changed` → invalidate agent/providers/config queries.
- **Run semantics**: `POST /v1/…/agent` is detached (202) — the run
  continues server-side if the tab closes; SSE on the next visit
  catches the user up. `setCurrent` (`POST …/current-session` with
  `client_id`) must fire whenever the active session changes — it
  scopes which session's permission/question prompts this tab gets.
- **Busy**: `pendingStore.busy[sessionId]` → composer `■ STOP`, slot
  row blink, input stays enabled.

### S4 — Message parts (tools, reasoning, shell)

`MessagePart` renders each `{type, data}` content part in order:

- `text` → markdown for assistant (react-markdown+GFM), pre-wrap for
  user. `hidden` parts skipped.
- `reasoning` → collapsed `<details>` "THINKING" block.
- `tool_call` → quest-log row: `» name` + `running` blink while
  `finished` is false, collapsible pretty-printed `input`.
- `tool_result` → collapsible `name result` (`· error` when
  `is_error`), mono scrollable output; empty results render nothing.
- `shell_command` → `$ command` + output block.
- Unknown part types → `null` (never crash on a new part type).
- Clamp long payloads (`utils/format.ts` `clamp`) — tool outputs can
  be MBs.

### S5 — Permissions (P1 decision)

- Trigger: `permission_request` SSE event (only for the session this
  tab registered via `setCurrent`).
- **Card** (pinned above composer, mauve accent): tool name +
  `wants permission`, `description`, `path` if any, pretty `params`.
- **Actions** → `POST …/permissions/grant` `{permission, action}`:
  `ALLOW` (once), `ALLOW FOR SESSION` (`allow_session`), `DENY`.
  Response removes the card; the agent continues server-side.
- `permission_notification` (answered elsewhere — e.g. a TUI also
  attached to the workspace) removes the card without action.
- Multiple pending → stack the cards oldest-first.
- `SKIP` toggle → `POST …/permissions/skip` — suppresses future
  prompts for the session (offers it as a workflow, not hidden config).

### S6 — Questions (dialog menu)

- Trigger: `question_batch_request` (agent asks the user a structured
  question mid-run).
- **Card**: batch of questions, each typed — `yes_no`, `single`,
  `multi`, `free_text` — render the matching control (radio row /
  checkbox row / input), per `questions/index.ts` wire types.
- **Answer** → `POST …/questions/answer` with the batch id + answers;
  **Cancel** → `POST …/questions/cancel`. Both clear the card;
  `question_batch_notification` clears it if answered elsewhere.

### S7 — Agent & model switching (HUD selects)

- `MODEL` chip → select populated from `useProviders(wid)` (provider →
  models) — selection → `PUT …/config/model` (contract's
  `ConfigClient`); `AGENT` chip → `useAgent(wid)` agents →
  `PUT …/config/agent` or equivalent SDK call. Reflect the current
  value from `useConfig(wid)`.
- `config_changed` SSE invalidates those queries — switching in a TUI
  updates the web HUD automatically.

### Mid-states & errors (first-class, not spinners)

- `STARTING…` while `ensureWorkspace` is in flight (per project).
- `EXTERNAL DOWN` screen when the selected external project reports
  down — `RETRY` re-calls `ensureWorkspace`.
- `CLONING…` picker row (S1).
- Generic `ApiError` → themed banner with `code` + message; 5xx →
  retry affordance.
- Everything keeps working while offline-ish: SSE reconnects, queries
  stay stale-visible.

---



- React 19 + TS strict, TanStack Query, Tailwind v4. Feature modules
  under `src/features/<domain>/`; shared primitives only via
  `@vishnu/ui-component/<subpath>` — never hand-roll a Button/Dialog.
- All network calls go through `@vishnu/api-contract` SDK clients —
  never `fetch`/`EventSource` with hardcoded URLs (paths live in the
  contract).
- Two clients: a control client `new ApiClient({ baseUrl: "/api" })`
  (auth/projects/users) and a **per-project** crush client
  `new ApiClient({ baseUrl: projectBaseUrl(pid), defaultQuery:
  { client_id } })` rebuilt whenever the selected project changes.
  `client_id` = `services/clientId.ts` (sessionStorage UUID per tab).
- `client_id` in the JSON **body** only for `POST /v1/workspaces`;
  everywhere else it rides `defaultQuery`.
- Mutations use the SDK, reads use `useQuery` keys from
  `hooks/queries.ts`; SSE events fan out via `hooks/useCrushEvents.ts`
  into the query cache + `pendingStore`.
- oxlint/oxfmt; `import type` for types; no `any`; comments only where
  the wire quirk isn't obvious from the code.
- Do NOT touch `api/` or `contract/` — if a needed type or endpoint is
  missing, flag it instead of working around it. `shared-ui/` is touched
  ONLY in PR 0, and only to swap hardcoded colors for theme tokens —
  no component API or visual changes there.

## Global verification (before every commit)

```bash
cd web && bun run lint && bun run build
```

and the full stack check: `cd .. && bun run build` (shared-ui →
contract → web) stays green.

---

## Design language — "vishnu retro"

Direction: **crush's terminal soul as an 8/16-bit game cabinet.** Crush's
TUI palette is gruvbox-based (warm dark browns, mustard, aqua, green,
soft mauve) — adopt it wholesale, then layer game-UI grammar on top.

### Palette (Tailwind theme tokens, from crush's styles)

```
bg       #1d2021 (cabinet) / #282828 (panel) / #32302f (raised)
fg       #ebdbb2 (phosphor text) / #a89984 (dim) / #665c54 (ghost)
accent   #fabd2f (mustard — primary actions, selected)
info     #83a598 (aqua — links, agent identity)
ok       #b8bb26 (green — connected, success)
warn     #fe8019 (orange — running tool, cloning)
err      #fb4934 (red — errors, deny)
pink     #d3869b (mauve — permissions/questions, user messages)
```

Status → color: `up`=ok, `starting`/`cloning`=warn blink,
`down`=ghost, `error`=err, `ready`=fg.

### Typography

shared-ui ships **no font tokens** — the app owns fonts entirely, so
declare them as Tailwind theme tokens in `web/src/index.css`:

```
@theme {
  --font-sans:    "JetBrains Mono", ui-monospace, monospace;  /* base  */
  --font-display: "VT323", "JetBrains Mono", monospace;       /* HUD   */
  --font-logo:    "Press Start 2P", "VT323", monospace;       /* title */
}
```

- **`--font-sans` = JetBrains Mono** — the base font is mono. Crush is a
  terminal: its whole UI is one monospace grid, so body text, inputs,
  lists and buttons all ride on it. (This is the design-system-aligned
  choice — crush's design system *is* monospace.)
- **`--font-display` = VT323** — the retro display face for headings,
  the topbar HUD, status words, dialog titles. Readable at UI sizes,
  authentically phosphor-terminal.
- **`--font-logo` = Press Start 2P** — only for the VISHNU wordmark on
  the title screen + picker header. Too heavy for anything else.
- Bundle via `@fontsource-variable/jetbrains-mono`, `@fontsource/vt323`,
  `@fontsource/press-start-2p` — no CDN, no runtime font fetch.
- Ligatures OFF, pixel faces get `letter-spacing: 0.02em` (they read
  cramped otherwise). Body text never uses the pixel fonts.

### Chrome & effects

- Borders: `2px solid` hard edges or box-drawing glyphs (╔═╗ ║ ╚═╝)
  on cards/dialogs — square corners, `rounded-none` or `rounded-sm`
  max. No soft shadows; depth = border + slightly-raised bg.
- Scanlines: subtle `repeating-linear-gradient` overlay (~3% black
  bands) behind the shell; phosphor glow `text-shadow` only on
  accent text. All effects behind `prefers-reduced-motion` and a
  "CRT fx" toggle in a future settings spot — default ON but cheap
  (pure CSS, no canvas).
- Cursor language: blinking `▊`/`▌` caret on focused inputs and the
  "waiting for agent" indicator; `▸` pointer for the selected
  menu/save-slot row.
- Motion: `steps()` / blip transitions, instant or ~80ms — never
  long fades/slides. Busy indicator = blocky step-spinner, not a
  smooth ring.

### Game metaphors (apply, don't cosplay)

| Surface | Treatment |
| --- | --- |
| Login | Title screen: VISHNU logo (ASCII-art or pixel mark), "enter your email to continue", code entry = 6-segment pixel OTP field |
| Project picker | Main menu: "SELECT PROJECT" list with `▸` pointer, status as HUD chip per row; "+ NEW GAME" = add project |
| Sessions sidebar | Save slots: `SLOT 01`, title, relative time; `+` new session |
| Topbar | HUD strip: project name, status LED (`● ONLINE`), model + agent as `SELECT` chips, hamburger |
| Tool calls | Quest-log rows: `» tool_name` with running blink, collapsible input/output |
| Permission card | "P1 DECISION" style modal — tool + path in a bordered box, `ALLOW` / `SESSION` / `DENY` as chunky buttons |
| Question card | Dialog-menu form (numbered/lettered options where typed) |
| Empty states | "INSERT COIN" energy — short, playful, still functional |

Rules: playful **accents**, never readability loss. Chat body text
stays normal-weight phosphor; glow/scanlines never sit under body
text; the theme is tokens + a few utility classes, not per-component
one-offs.

---

## PR 0 — shared-ui: consume its own theme tokens

**Goal:** make the vendored `@vishnu/ui-component` rethemeable — it
already defines `--color-surface`/`--color-surface-alt` in
`styles.css`, but ~25 components hardcode `bg-white`/`text-black`
instead of using them, so a dark theme renders white cards.

- In `shared-ui/ui-component/**`, replace hardcoded surface colors with
  the tokens Tailwind v4 generates from `styles.css`'s `@theme` block:
  `bg-white` → `bg-surface`, `bg-neutral-50`-style page fills →
  `bg-surface-alt`, `text-white`/`text-black` where they mean
  on-surface/fg → the matching token. If a needed semantic token is
  missing (`--color-on-surface`, `--color-border`), add it to
  `styles.css`'s `@theme` — don't invent per-component vars.
- **Scope**: only the components vishnu's app imports — `button`,
  `chip`, `dialog`, `drawer`, `input/*` (Input, TextAreaInput, Select,
  Checkbox, Radio, Switch, SegmentedControl), `menu`, `popover`,
  `tooltip`, `emptyState`, `alert`, `message`, `loadingAnimation`,
  `tabs`, `form`, `text`, `pagination`, `dataList`, `actionBar`,
  `wrapper/ContentWrapper`. Leave `calendar/`, `table/`, `slider/`,
  `stepper/` etc. for later — flag them as unthemed in a comment on the
  follow-ups list.
- **No API changes, no visual changes** — under the default
  (`surface=white`) theme every component must render identically.
  This is a token indirection PR.
- If `index.ts`/`package.json#exports` change (they shouldn't), sync
  `docs/PUBLIC_API.*` per `shared-ui/AGENTS.md`; otherwise leave them.

**Acceptance:** `bun run build && bun run lint` in `shared-ui/` clean;
`git diff` touches only class strings + the `@theme` block; a local
override of `--color-surface: #1d2021` in a scratch page rethemes
Dialog/Drawer/Input without code changes.

## PR 1 — service layer + auth gate

**Goal:** the app talks to the real API; an unauthenticated user hits a
login gate. Implements the **Auth model** section and screen **S0**.

- `services/api.ts`: rebuild around the contract — `apiClient =
  new ApiClient({ baseUrl: "/api" })`, singletons `authClient`,
  `projectsClient`, `usersClient`; plus a `bindProject(pid)` that
  constructs the `/p/{pid}/v1` `ApiClient` and refreshes all crush
  domain-client singletons (`SessionsClient`, `EventsClient`, …).
  Export a `projectId` holder the rest of the app reads.
- `hooks/queries.ts`: add `useMe`, `useRequestOtp`, `useVerify`,
  `useLogout`, `useProjects`, `useCreateProject`, `useDeleteProject`,
  `useProjectWorkspace`; existing crush queries take
  `workspaceId`/`projectId` and stay disabled until bound.
- `features/auth/LoginScreen.tsx`: email → request-otp → 6-digit code
  → verify. Handles `code_expired`/`invalid_code`/`too_many_attempts`
  from `ApiError.code`; resend behind a 60s client cooldown.
- `App.tsx`: gate on `useMe` — 401/`unauthorized` → `<LoginScreen/>`;
  `ApiError` 401 anywhere else forces re-check of `me` (expired
  session → login, not a dead screen).
- `vite.config.ts`: dev proxy `"/api"` and `"/p"` →
  `http://127.0.0.1:8080` (the running API; cookie + SSE both pass
  through `server.proxy` — the old `/v1 → :9119` entry is dead, remove
  it). Prod needs nothing — the binary serves the SPA same-origin.
- Keep current visuals minimal — theme lands in PR 3.

**Acceptance:** logged-out browser gets the gate; after verify, the
app loads; logout returns to the gate.

## PR 2 — project flows

**Goal:** multi-project is real in the UI. Implements **S1** and the
shell skeleton of **S2** (the chat internals S3–S7 already exist in the
v1 scaffold — rewire them through the rebound clients).

- `features/projects/ProjectPicker.tsx` — list from `useProjects`:
  name, mode chip (managed/external), merged status, `created_at`.
  Select → `useProjectWorkspace(id)` (lazy-start + ensure) → bind the
  project client → enter shell. Per-row states: `cloning` (busy +
  poll `get(id)` until ready/error), `error` (message + delete),
  `down` for external.
- `features/projects/AddProjectDialog.tsx` — three tabs mirroring the
  API: **GitHub** (`repo_url` — hint that access is checked server-side),
  **Link** (existing `path`), **External** (`upstream` URL). Exactly
  one source per create; 409 → "already registered".
- `features/projects/` delete flow — confirm dialog; managed = stops
  crush, all = soft-delete; disk untouched (say so in the copy).
- `App.tsx` state machine: `me` → `project` → `workspace` → session
  shell. Project switch tears down: close EventSource, clear
  `activeSessionId`, rebind clients, re-run ensure-workspace.
- Shell screens for the in-between states (picking…, starting…,
  external down with retry) instead of blank panes.

**Acceptance:** add via all three modes; clone shows progress then
turns selectable; switching projects swaps sessions/messages and the
SSE stream targets the new `/p/{pid}`; delete removes the row.

## PR 3 — retro-game theme

**Goal:** every screen **S0–S7** reskinned per "Design language", driven by
`@theme` overrides — shared-ui rethemes automatically after PR 0.

- `web/src/index.css` `@theme` overrides (the mechanism `styles.css`
  documents): `--color-primary-*` indigo → mustard scale anchored on
  `#fabd2f`, `--color-neutral-*` slate → warm gruvbox browns,
  `--color-danger-*` → gruvbox reds, `--color-surface(-alt)` →
  `#282828`/`#1d2021`, `--color-on-surface`/`--color-border` →
  `#ebdbb2`/`#665c54`, and `--radius-*` → `0`/`2px` so every shared-ui
  `rounded-md`/`rounded-lg` goes square without touching the package.
  Plus the font tokens from Typography. A retheme is a token swap —
  hex literals must not appear outside this block.
- Utility classes in `index.css`: `.crt-scanlines`, `.pixel-border`,
  `.glow`, `.blink`, `.step-spin`; font utility classes come free from
  the `--font-*` tokens (`font-display`, `font-logo`).
- Restyle in place — `index.css` overrides where shared-ui allows
  (Tailwind v4 tokens/CSS vars), feature-level classes elsewhere:
  LoginScreen (title screen), ProjectPicker (main menu),
  SessionSidebar (save slots), TopBar (HUD + LED), Composer (prompt
  `>` line), MessageParts (quest-log tool rows, phosphor text,
  mono pre blocks), Permission/Question cards (decision boxes),
  dialogs/drawer (hard borders, square corners).
- Icons: keep iconify glyphs but prefer `ri:` line icons that read
  pixel-ish; the VISHNU wordmark/logo block on login + picker.
- A11y floor: contrast ≥ AA on body text, effects off under
  `prefers-reduced-motion`, focus rings visible (accent outline).

**Acceptance:** every screen from PRs 1–2 in-theme; no `rounded-*`
softer than `sm` survives; `bun run build` clean; theme is tokens +
utilities (grep-able), not scattered hex literals.

## PR 4 — polish, edge cases, mobile

**Goal:** shippable feel.

- Session lifecycle: new-session auto-select, delete-confirm,
  session switch while busy stays readable; `current-session`
  reporting still correct after project switch.
- Busy/cancel: composer swaps to a cancel affordance while the agent
  runs (`agent/sessions/{id}/cancel`); run completes/errors clear the
  busy state (already dispatched — verify UI reacts).
- Connection LED reflects SSE state from `pendingStore` (open /
  reconnecting / closed) — `EventSource` auto-reconnects, show it.
- Error surfacing: `ApiError` → a themed inline/banner message with
  `code`; upstream-down for the active project offers a retry of
  `ensureWorkspace`.
- Mobile portrait: sidebar → drawer, prompts + composer fit safe
  areas, session list reachable; nothing requires hover.
- Smoke doc: README section or `docs/` note with the manual pass —
  login → add project (each mode) → select → chat → tool call →
  permission → question → model switch → logout.

**Acceptance:** the manual smoke path above works end to end on the
running stack; `bun run lint && bun run build` clean.

---

## Definition of done (whole epic)

- Login → project pick → workspace → sessions → chat → answer
  permission + question → switch model/agent → cancel — all through
  the contract SDKs, all in-theme.
- Three add-project modes work; cloning/error/down states render
  correctly; switching projects never leaks state between them.
- No hardcoded URLs or `fetch` in `web/src` outside `services/api.ts`;
  no component hex literals outside the theme tokens — shared-ui
  rethemes purely through `@theme` overrides.
- `shared-ui` ships the surface-token fix with zero visual/API drift.
- `bun run build` (root) green; `make build` produces a working
  embedded SPA (`api/internal/webui`).
- `docs/plan/web.md` updated if the layout/file tree moved;
  `PLAN.md` Status refreshed.
