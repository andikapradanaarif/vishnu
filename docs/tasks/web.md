# web/ implementation — agent task breakdown

Assignee: rewire `web/` onto the shipped API + contract, and rebuild the
UI in the **vishnu retro-game theme**. Work is split into **4 PR-sized
milestones** — land them in order; each PR must lint, typecheck and
build clean. Commit per topic inside a PR.

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

## Conventions (valo/nexus style — non-negotiable)

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
- Do NOT touch `api/`, `contract/`, `shared-ui/` — if a needed type or
  endpoint is missing, flag it instead of working around it.

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

- **Display/HUD**: a pixel font — "VT323" or "Press Start 2P" (via
  `@fontsource`; bundle it, no CDN) for the title screen, headings,
  topbar HUD, big status words.
- **Body/code**: JetBrains Mono (or IBM Plex Mono) — crush is a
  terminal, everything data-shaped is monospace.
- `font-feature` ligatures OFF; letter-spacing slightly loose on
  pixel font (it reads cramped otherwise).

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

## PR 1 — service layer + auth gate

**Goal:** the app talks to the real API; an unauthenticated user hits a
login gate.

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
- Keep current visuals minimal — theme lands in PR 3.

**Acceptance:** logged-out browser gets the gate; after verify, the
app loads; logout returns to the gate.

## PR 2 — project flows

**Goal:** multi-project is real in the UI.

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

**Goal:** the whole app reskinned per "Design language", shared-ui
respectfully overridden.

- `index.css` + Tailwind theme tokens for the palette above; pixel +
  mono font stacks loaded via `@fontsource` packages (add deps);
  utility classes: `.crt-scanlines`, `.pixel-border`, `.glow`,
  `.blink`, `.step-spin`.
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
  no component hex literals outside the theme tokens.
- `bun run build` (root) green; `make build` produces a working
  embedded SPA (`api/internal/webui`).
- `docs/plan/web.md` updated if the layout/file tree moved;
  `PLAN.md` Status refreshed.
