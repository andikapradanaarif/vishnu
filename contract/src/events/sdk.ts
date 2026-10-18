import { buildPath, type ApiClient } from "../client";
import { v1WorkspaceEvents } from "../paths";

/**
 * SDK client for the `/workspaces/{id}/events` SSE stream. The stream is
 * consumed via `EventSource`, so this client only resolves the URL —
 * `client_id` rides via the ApiClient defaultQuery.
 *
 * @example
 * const es = new EventSource(events.url(workspaceId));
 */
export class EventsClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** Full URL for `GET /workspaces/{id}/events` (includes `client_id`). */
	url(workspaceId: string): string {
		return this.api.resolveUrl(buildPath(v1WorkspaceEvents, { id: workspaceId }));
	}
}
