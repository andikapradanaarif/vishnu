import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceById,
	v1WorkspaceProjectInit,
	v1WorkspaceProjectInitPrompt,
	v1WorkspaceProjectNeedsInit,
	v1Workspaces,
} from "../paths";
import type {
	CreateWorkspaceRequest,
	ProjectInitPromptResponse,
	ProjectNeedsInitResponse,
	Workspace,
} from "../types";

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

	/** GET `/workspaces/{id}/project/needs-init` — whether the project still needs `/init`. */
	needsInit(workspaceId: string): Promise<ProjectNeedsInitResponse> {
		return this.api.get<ProjectNeedsInitResponse>(
			buildPath(v1WorkspaceProjectNeedsInit, { id: workspaceId }),
		);
	}

	/** GET `/workspaces/{id}/project/init-prompt` — the codebase-scan prompt for `/init`. */
	initPrompt(workspaceId: string): Promise<ProjectInitPromptResponse> {
		return this.api.get<ProjectInitPromptResponse>(
			buildPath(v1WorkspaceProjectInitPrompt, { id: workspaceId }),
		);
	}

	/** POST `/workspaces/{id}/project/init` — mark the project initialized. */
	markInitialized(workspaceId: string): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspaceProjectInit, { id: workspaceId }));
	}
}
