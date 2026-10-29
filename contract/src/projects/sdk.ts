import { buildPath, type ApiClient } from "../client";
import {
	vishnuProjectAgent,
	vishnuProjectById,
	vishnuProjectPermissionsSkip,
	vishnuProjectWorkspace,
	vishnuProjects,
} from "../paths";
import type {
	CreateProjectRequest,
	Project,
	ProjectEnvelope,
	SetAgentRequest,
	SetPermissionSkipRequest,
	WorkspaceResponse,
} from "./index";

/**
 * SDK client for `/api/projects`. Clone-mode creates answer 202 with the
 * same `{project}` body, so callers check `status` rather than the code.
 *
 * @example
 * const projects = new ProjectsClient(new ApiClient({ baseUrl: "/api" }));
 * const all = await projects.list();
 */
export class ProjectsClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** GET `/projects` — the API answers with a bare array. */
	list(): Promise<Project[]> {
		return this.api.get<Project[]>(vishnuProjects);
	}

	/** POST `/projects` — 201, or 202 for clone mode (same body shape). */
	async create(req: CreateProjectRequest): Promise<Project> {
		const { project } = await this.api.post<ProjectEnvelope>(
			vishnuProjects,
			req,
		);
		return project;
	}

	/** DELETE `/projects/{id}` — registry-only; the row is soft-deleted (204). */
	delete(id: string): Promise<void> {
		return this.api.delete<void>(buildPath(vishnuProjectById, { id }));
	}

	/** GET `/projects/{id}/workspace` — ensure and return the workspace. */
	workspace(id: string): Promise<WorkspaceResponse> {
		return this.api.get<WorkspaceResponse>(
			buildPath(vishnuProjectWorkspace, { id }),
		);
	}

	/**
	 * PUT `/projects/{id}/permissions/skip` — store the project's
	 * workspace-wide auto-approve default. vishnu persists it and replays
	 * it onto the crush server each time it ensures the workspace, so the
	 * setting outlives the child that serves it.
	 */
	setPermissionSkip(id: string, skip: boolean): Promise<Project> {
		return this.api.put<Project>(
			buildPath(vishnuProjectPermissionsSkip, { id }),
			{ skip } satisfies SetPermissionSkipRequest,
		);
	}

	/**
	 * PUT `/projects/{id}/agent` — store the project's main agent. Crush
	 * resets its coordinator to coder on every child start, so vishnu
	 * keeps the choice and replays it when it ensures the workspace.
	 */
	setAgent(id: string, agent: string): Promise<Project> {
		return this.api.put<Project>(
			buildPath(vishnuProjectAgent, { id }),
			{ agent } satisfies SetAgentRequest,
		);
	}
}
