import { ApiClient } from "@vishnu/api-contract/client";
import { projectBaseUrl } from "@vishnu/api-contract/paths";
import { AgentClient } from "@vishnu/api-contract/agent";
import { AuthClient } from "@vishnu/api-contract/auth";
import { ConfigClient } from "@vishnu/api-contract/config";
import { EventsClient } from "@vishnu/api-contract/events";
import { PermissionsClient } from "@vishnu/api-contract/permissions";
import { ProjectsClient } from "@vishnu/api-contract/projects";
import { QuestionsClient } from "@vishnu/api-contract/questions";
import { SessionsClient } from "@vishnu/api-contract/sessions";
import { UsersClient } from "@vishnu/api-contract/users";
import { WorkspacesClient } from "@vishnu/api-contract/workspaces";
import { clientId } from "./clientId";

/**
 * Every request is same-origin and the session lives in an HttpOnly
 * cookie, so the client has to opt into sending credentials explicitly.
 * `same-origin` would do the same today; declaring `include` keeps the
 * dev proxy and a future cross-origin deployment working.
 */
const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: "include" });

/** Control-plane API — auth, projects, users. No `client_id`. */
export const controlClient = new ApiClient({
	baseUrl: "/api",
	fetch: fetchWithCredentials,
});

export const authClient = new AuthClient(controlClient);
export const projectsClient = new ProjectsClient(controlClient);
export const usersClient = new UsersClient(controlClient);

/**
 * The selected project's crush server is mounted at `/p/{pid}/v1`.
 * `client_id` rides on every crush request so the server can scope
 * permission/question delivery to this tab.
 */
const UNBOUND_BASE = "/p/unbound/v1";

let projectId: string | undefined;

/** The project the crush clients are currently bound to, if any. */
export function currentProjectId(): string | undefined {
	return projectId;
}

function makeCrushApi(pid: string | undefined): ApiClient {
	return new ApiClient({
		baseUrl: pid ? projectBaseUrl(pid) : UNBOUND_BASE,
		defaultQuery: { client_id: clientId() },
		fetch: fetchWithCredentials,
	});
}

let crushClient = makeCrushApi(undefined);

export let workspacesClient = new WorkspacesClient(crushClient);
export let sessionsClient = new SessionsClient(crushClient);
export let agentClient = new AgentClient(crushClient);
export let configClient = new ConfigClient(crushClient);
export let permissionsClient = new PermissionsClient(crushClient);
export let questionsClient = new QuestionsClient(crushClient);
export let eventsClient = new EventsClient(crushClient);

/**
 * Rebind the crush domain clients to a project. Call this whenever the
 * selected project changes and before issuing any `/p/{pid}/v1` call.
 */
export function bindProject(pid: string | undefined): void {
	projectId = pid;
	crushClient = makeCrushApi(pid);
	workspacesClient = new WorkspacesClient(crushClient);
	sessionsClient = new SessionsClient(crushClient);
	agentClient = new AgentClient(crushClient);
	configClient = new ConfigClient(crushClient);
	permissionsClient = new PermissionsClient(crushClient);
	questionsClient = new QuestionsClient(crushClient);
	eventsClient = new EventsClient(crushClient);
}
