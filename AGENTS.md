# Vishnu

Browser UI + thin proxy for driving `crush server` (`/v1` HTTP API incl. SSE).
Monorepo, bun workspaces — style/stack follows valo & nexus-bo-api.

## Layout

- `api/` — Go module `github.com/andikapradanaarif/vishnu`, Fiber v3.
  `cmd/server` → `internal/{config,service,handler}`. Proxies `/v1/*` to crush
  (SSE via SendStreamWriter, no upstream timeout), serves embedded SPA.
- `web/` — Vite + React 19 + TS strict, TanStack Query, Tailwind v4,
  components from `@vishnu/ui-component` (`shared-ui/`), feature code in
  `src/features/<domain>/`.
- `shared-ui/` — vendored copy of nexus `shared-ts` (`@vishnu/ui-component`).
- `docs/PLAN.md`, `docs/plan/{api,web}.md` — architecture plans.

## Commands

- `bun install` — install all workspaces.
- `bun run build` (root) — builds shared-ui then web.
- `web/`: `bun run dev` (vite, proxies `/v1` → `127.0.0.1:9119`), `bun run lint`, `bun run build`.
- `api/`: `make dev` (VISHNU_WEB_DIR=../web/dist), `make build` (embeds web/dist → bin/vishnu-api), `make test`, `make lint`.

## Runtime

```bash
cd <project> && crush server --host tcp://127.0.0.1:9119   # upstream
cd api && make build && ./bin/vishnu-api                   # http://127.0.0.1:8080
```

Env: `VISHNU_LISTEN_ADDR` (default `127.0.0.1:8080`, loopback only — a
shell-capable agent must not be LAN-exposed), `VISHNU_CRUSH_UPSTREAM`
(default `http://127.0.0.1:9119`), `VISHNU_WEB_DIR` (dev override for embed).

## Crush wire notes

- Workspace create: `POST /v1/workspaces` with `client_id` **in JSON body**.
- Other mutating endpoints take `?client_id=<uuid>` query param.
- Events: `GET /v1/workspaces/{id}/events?client_id=<uuid>` (SSE).
- Content parts are `{type, data}` envelopes; SSE payloads are `{type, payload}`.

## Conventions

- Go: gofumpt → goimports; slog messages capitalized; JSON snake_case.
- TS: oxlint/oxfmt; import UI only via `@vishnu/ui-component` subpath exports.
