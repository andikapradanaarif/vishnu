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
	/** Workspace-wide auto-approve default, persisted by vishnu so it
	    survives the crush server recycling when the last tab closes. */
	permission_skip: boolean;
	/** Main agent (coder/plan/task), persisted for the same reason —
	    crush's coordinator resets to coder on every child start. */
	agent: string;
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

/** Body of `PUT /projects/{id}/permissions/skip`. */
export interface SetPermissionSkipRequest {
	skip: boolean;
}

/** Body of `PUT /projects/{id}/agent`. */
export interface SetAgentRequest {
	agent: string;
}

export interface WorkspaceResponse {
	workspace_id: string;
	upstream: string;
	status: ProjectStatus;
}

export * from "./sdk";
