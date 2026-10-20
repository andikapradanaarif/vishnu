# contract/ SDK — agent task breakdown

Assignee: extend `@vishnu/api-contract` so the web app can talk to both
surfaces — the vishnu API (`/api/*`) and each project's crush server
(`/p/{pid}/v1/*`). Work is split into **3 PR-sized milestones** — land
them in order; each PR must build and lint clean. Commit per topic.

Canonical docs: `docs/PLAN.md` (grand), `plan/api.md` (routes + wire
notes), `plan/projects.md` (registry lifecycle + status model),
`plan/data.md` (user/auth schema). `docs/tasks/api.md` describes what
the API actually shipped — treat it as the contract's reference
implementation. When doc and code disagree, the shipped code wins —
the API is live.

## Conventions (nexus-contract style — non-negotiable)

- Package `@vishnu/api-contract`, root `contract/`, TS strict.
- One directory per domain: `src/<domain>/{index.ts,sdk.ts}` —
  `index.ts` holds wire types, `sdk.ts` holds the `XClient` class.
- All paths are constants in `src/paths.ts`, resolved through
  `buildPath`/`withQuery` — never string-interpolate URLs inline.
- SDK classes wrap `ApiClient` (`src/client.ts`); requests go through
  `api.get/post/put/delete` — never call `fetch` directly.
- Errors surface as `ApiError` (status + parsed `{message, code}` body).
- No runtime dependencies beyond `fetch`; no new deps without asking.
- oxlint/oxfmt style; `import type` for type-only imports.
- Do NOT touch `web/`, `api/`, `shared-ui/` in these PRs — the web
  rewiring is a separate task.

## Global verification (run before every commit)

```bash
cd contract && bun run build && bun run lint
```

`bun run build` runs `scripts/build.sh` (tsc for d.ts + bun build per
entry). `bun run lint` is oxlint + oxfmt check.

## Context: the two API surfaces

The API (merged, `api/internal/handler/`) exposes:

**vishnu API — `baseUrl: "/api"`, no `client_id`:**

```
POST   /api/auth/request-otp   {email}        → 200 always (non-enumerating)
POST   /api/auth/verify        {email, code}  → {user} + vishnu_session cookie
POST   /api/auth/logout                         → 204
GET    /api/auth/me                             → {user}
GET    /api/projects                            → {projects: Project[]}
POST   /api/projects         {name?} + one of {repo_url} | {path} | {upstream}
                                                → 201 {project} or 202 (cloning)
GET    /api/projects/{id}                       → {project}
DELETE /api/projects/{id}                       → 204
GET    /api/projects/{id}/workspace             → {workspace_id, upstream, status}
POST   /api/users            {email, name?, role?} → 201 {user}  (admin only)
GET    /healthz                                 → {status: "ok"} (public)
```

**crush API — `baseUrl: "/p/{pid}/v1"`, `client_id` in query on
mutating calls + the events stream, in the JSON body on workspace
create.** The existing `src/{workspaces,sessions,agent,config,
permissions,questions,events}` SDKs cover this surface; they just need
a project-aware base URL (PR 1).

Errors from both surfaces: `{message: string, code: string}` —
`ErrorBody` already matches; make sure `code` is exposed on `ApiError`.

Wire types to mirror (read the Go source of truth):

- `domain.User`/`userResponse`: `{id, email, name?, role: "admin"|"member"}`
- `dto.ProjectResponse`: `{id, name, mode: "managed"|"external", status,
  path?, port?, repo_url?, upstream?, error?, created_at, updated_at}`
- `status` merges lifecycle + liveness: `"cloning" | "error" | "down" |
  "starting" | "up"` (see `project_usecase.effectiveStatus`)
- `dto.CreateProjectRequest`: `{name?, repo_url?, path?, upstream?}` —
  exactly one source field
- `dto.WorkspaceResponse`: `{workspace_id, upstream, status}`
- `dto.CreateUserRequest`-equivalent body: `{email, name?, role?}`

---

## PR 1 — project-aware client + error surface

**Goal:** the existing crush SDKs work against `/p/{pid}/v1`, and
`ApiError` carries `code`.

- `src/paths.ts`: add a `vishnuProjectBase = "/p/{pid}/v1"` constant and
  a `projectBaseUrl(projectId: string)` helper returning
  `"/p/<pid>/v1"` (buildPath + encodeURIComponent inside). Doc-comment
  that crush SDK clients are constructed per selected project:
  `new ApiClient({ baseUrl: projectBaseUrl(pid), defaultQuery: { client_id } })`.
- `src/client.ts`: `ApiError` gains `readonly code?: string` parsed from
  the body; add an `isAuthError`/`status === 401` convenience so the web
  can redirect to login without status-number checks. Keep `message`
  behavior unchanged.
- Verify `defaultQuery` stays opt-in — the vishnu API client must not
  send `client_id` (the API ignores unknown params, but don't ship it).
- Tests: if a test setup exists use it; otherwise add a minimal
  `bun test` spec covering `projectBaseUrl` encoding and `ApiError.code`.

**Acceptance:** `new ApiClient({ baseUrl: projectBaseUrl("abc") })` +
`eventsClient.url(wid)` yields `/p/abc/v1/workspaces/<wid>/events?client_id=…`.

## PR 2 — vishnu SDK: auth, projects, users

**Goal:** typed clients for every `/api/*` route above.

- `src/auth/{index,sdk}.ts` — types `User`, `UserRole`,
  `{user}`-envelope responses; `AuthClient` with `requestOtp(email)`,
  `verify(email, code)`, `logout()`, `me()`. Cookie auth is implicit
  (same-origin `fetch`, `credentials` default) — do not add header
  plumbing.
- `src/projects/{index,sdk}.ts` — types `Project`, `ProjectMode`,
  `ProjectStatus`, `CreateProjectRequest`, `WorkspaceResponse`;
  `ProjectsClient` with `list()`, `get(id)`, `create(req)`, `delete(id)`,
  `workspace(id)`. `create` returns `Promise<Project>` — the handler
  answers 201 or 202-with-the-same-shape for clone mode; read the
  response body either way and let the caller check `status`.
- `src/users/{index,sdk}.ts` — `UsersClient.create({email, name?, role?})`
  (admin-only; 403 surfaces as `ApiError` with `code: "forbidden"`).
- These clients take the same `ApiClient` class with
  `baseUrl: "/api"` — one class, two bindings. Add a doc example.
- `src/index.ts`: export the new domains alongside the crush ones;
  check `package.json` `exports` covers any new subpath entry points.

**Acceptance:** from a browser console against the running stack —
`projectsClient.list()` returns registered projects,
`projectsClient.workspace(id)` returns `{workspace_id, …}`,
`authClient.me()` returns the signed-in user, all fully typed.

## PR 3 — crush wire audit + packaging

**Goal:** the crush-side types match the crush binary the image ships.

- Audit `src/types.ts` and `src/paths.ts` against crush `v0.98.1` (the
  `CRUSH_VERSION` in `api/Dockerfile`): SSE event envelope `{type,
  payload}` event names, `Message`/`ContentPart` shapes (`text`,
  `reasoning`, `tool_call`, `tool_result`, `shell_command`),
  `PermissionRequest`/`QuestionRequest` payloads, config/model/provider
  response shapes. Diff against `internal/server` + `internal/agent`
  in the crush source — fix mismatches, don't paper over them.
- `package.json`: confirm `exports` exposes each new domain subpath the
  same way existing ones are published (`./paths`, domain barrels).
- `contract/README.md` (create if absent — check what exists first):
  the two-client recipe (`/api` control client + per-project `/p/{pid}/v1`
  client), the `client_id` rule (query vs body), and the SSE pattern
  (`eventsClient.url` → `EventSource`).

**Acceptance:** `bun run build && bun run lint` clean; a consumer doing
`import { ProjectsClient, projectBaseUrl } from "@vishnu/api-contract"`
compiles under `web/`'s tsconfig without any `// @ts-ignore`.

---

## Definition of done (whole epic)

- Every `/api/*` route has a typed SDK method; every crush `/v1` path the
  web uses is reachable through `projectBaseUrl(pid)`-scoped clients.
- No `fetch`/`EventSource` URL strings hardcoded outside `paths.ts` +
  the SDKs.
- `bun run build && bun run lint` clean at every commit; types compile
  under the web tsconfig.
- Root `bun run build` (shared-ui → contract → web) still green.
- `docs/tasks/` is where this file lives — update `PLAN.md` Status if
  the contract milestone lands.
