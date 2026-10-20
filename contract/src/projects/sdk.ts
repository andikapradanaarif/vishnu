import { buildPath, type ApiClient } from "../client";
import {
	vishnuProjectById,
	vishnuProjectWorkspace,
	vishnuProjects,
} from "../paths";
import type {
	CreateProjectRequest,
	Project,
	ProjectEnvelope,
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
}
