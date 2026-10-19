# @vishnu/api-contract

Typed wire types and SDK clients for the two HTTP surfaces vishnu exposes:

- the **vishnu API** under `/api` (auth, project registry, users), and
- each project's **crush server** under `/p/{pid}/v1`.

One `ApiClient` class drives both; the base URL is the only difference.

## Two clients

```ts
import { ApiClient } from "@vishnu/api-contract/client";
import {
	AuthClient,
	EventsClient,
	ProjectsClient,
	UsersClient,
	WorkspacesClient,
} from "@vishnu/api-contract";
import { projectBaseUrl } from "@vishnu/api-contract/paths";

// Control plane: the vishnu API. No client_id here.
const api = new ApiClient({ baseUrl: "/api" });
const auth = new AuthClient(api);
const projects = new ProjectsClient(api);
const users = new UsersClient(api);

const me = await auth.me();
const all = await projects.list();
const { workspace_id } = await projects.workspace(projectId);

// One selected project's crush server.
const crush = new ApiClient({
	baseUrl: projectBaseUrl(projectId),
	defaultQuery: { client_id },
});
const workspaces = new WorkspacesClient(crush);
const events = new EventsClient(crush);
```

`client_id` is a per-tab UUID. It is **opt-in**: only the crush client passes
`defaultQuery`; the `/api` client must not send it.

## `client_id` placement

- crush `/v1`: **query param** on mutating calls and the events stream.
- `POST /v1/workspaces`: **JSON body** (`CreateWorkspaceRequest.client_id`) —
  crush registers the creating client from the body.
- vishnu `/api`: never.

## SSE

The events stream is consumed by `EventSource`, which cannot set headers, so
`client_id` rides in the query:

```ts
const source = new EventSource(events.url(workspaceId));
source.onmessage = (message) => {
	const { type, payload } = JSON.parse(message.data) as EventPayload;
};
```

## Notes

- The shipped API is the reference: `GET /api/projects` returns a bare
  `Project[]`, and `GET /api/projects/{id}` is not shipped, so
  `ProjectsClient` has no `get()`.
- Clone-mode `create()` answers `202` with the same `{project}` body; check
  `project.status` rather than the HTTP code.
- Errors from both surfaces are `{message, code}` and surface as `ApiError`
  with `status`, `code` and an `isAuthError` shortcut for 401s.

## Verify

```bash
bun run build && bun run lint && bun test
```
