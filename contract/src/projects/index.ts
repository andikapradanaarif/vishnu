export type ProjectMode = "managed" | "external";

/** Persisted lifecycle merged with the live process status, as returned. */
export type ProjectStatus = "cloning" | "error" | "down" | "starting" | "up";

export interface Project {
	id: string;
	name: string;
	mode: ProjectMode;
	status: ProjectStatus;
	path?: string;
	repo_url?: string;
	upstream?: string;
	port?: number;
	error?: string;
}

/** Exactly one source field (`repo_url` | `path` | `upstream`) is required. */
export interface CreateProjectRequest {
	name?: string;
	repo_url?: string;
	path?: string;
	upstream?: string;
}

/** `{project}` envelope returned by create. */
export interface ProjectEnvelope {
	project: Project;
}

export interface WorkspaceResponse {
	workspace_id: string;
	upstream: string;
	status: ProjectStatus;
}

export * from "./sdk";
