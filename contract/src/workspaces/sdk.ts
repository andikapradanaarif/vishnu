import { buildPath, type ApiClient } from "../client";
import { v1WorkspaceById, v1Workspaces } from "../paths";
import type { CreateWorkspaceRequest, Workspace } from "../types";

/**
 * SDK client for the `/workspaces` endpoints.
 *
 * @example
 * const workspaces = new WorkspacesClient(api);
 * const [ws] = await workspaces.list();
 */
export class WorkspacesClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** GET `/workspaces` — list running workspaces. */
	list(): Promise<Workspace[]> {
		return this.api.get<Workspace[]>(v1Workspaces);
	}

	/** GET `/workspaces/{id}` — get a single workspace. */
	get(id: string): Promise<Workspace> {
		return this.api.get<Workspace>(buildPath(v1WorkspaceById, { id }));
	}

	/**
	 * POST `/workspaces` — create a workspace. `client_id` rides in the
	 * JSON body (crush registers the creating client).
	 */
	create(req: CreateWorkspaceRequest): Promise<Workspace> {
		return this.api.post<Workspace>(v1Workspaces, req);
	}
}
