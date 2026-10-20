# Manual smoke pass

Prerequisites:

- Postgres: `cd api && make db && make migrate`
- API + SPA: `make dev` (`VISHNU_WEB_DIR=../web/dist`) or the docker
  stack via `make up`.
- Dev SPA: `cd web && bun run dev` — the dev proxy forwards `/api` and
  `/p` to `http://127.0.0.1:8080`.
- Sign-in codes go through Brevo when it is configured; otherwise the
  server logs the code. `VISHNU_BOOTSTRAP_EMAIL` seeds the first admin.

1. **Login** — open the SPA, enter the email, wait for the code, sign
   in. `LOG OUT` returns to the title screen.
2. **Add projects** — GitHub mode with `owner/repo` (row appears
   `CLONING`, then `UP`), Link mode with an existing server path, and
   External mode with an upstream crush server. A duplicate reports
   `[conflict] already registered`; a bad path reports
   `[invalid_path] directory not found on the server`.
3. **Select a project** — `STARTING…` shows while the workspace is
   ensured, then the HUD flips to `● ONLINE`. An unreachable external
   upstream shows `EXTERNAL DOWN` with `RETRY`.
4. **Sessions** — `+` creates and auto-selects a save slot; delete asks
   for a second click; switching sessions keeps each busy state
   independent.
5. **Chat** — send a prompt, watch streamed text and quest-log tool
   rows, stop a run with `■ STOP`, and confirm the composer returns to
   `SEND`.
6. **Permission** — trigger a tool that needs approval; `ALLOW`,
   `SESSION` and `DENY` clear the decision box and the run continues.
7. **Question** — trigger the question tool; answer the typed controls
   (`yes_no`, `single`, `multi`, `free_text`) and submit; `DISMISS`
   also clears the card.
8. **Model and agent** — switch both from the HUD; a `config_changed`
   from an attached TUI updates the selects.
9. **Reconnect** — restart the API; the LED shows `RECONNECTING`, then
   `ONLINE`, and the transcript catches up.
10. **Mobile** — narrow the viewport: the sidebar lives in the
    hamburger drawer, prompts and the composer fit the safe area, and
    delete controls are reachable without hover.

Verification before shipping: `cd web && bun run lint && bun run build`,
plus `bun run build` at the root.
