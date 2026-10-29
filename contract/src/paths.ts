/**
 * Hand-maintained mirror of `crush server` routes (internal/server).
 * All paths are relative to the `/v1` base — pass `baseUrl: "/v1"` to
 * ApiClient. Import named constants instead of hardcoding strings so
 * path values stay in sync with the contract.
 *
 * @example
 * import { v1WorkspaceSessions } from "@vishnu/api-contract/paths";
 * buildPath(v1WorkspaceSessions, { id: workspaceId });
 */
import { buildPath } from "./client";

export const v1Workspaces = "/workspaces";
export const v1WorkspaceById = "/workspaces/{id}";
export const v1WorkspaceSessions = "/workspaces/{id}/sessions";
export const v1WorkspaceSessionById = "/workspaces/{id}/sessions/{session_id}";
export const v1WorkspaceSessionMessages = "/workspaces/{id}/sessions/{session_id}/messages";
export const v1WorkspaceEvents = "/workspaces/{id}/events";
export const v1WorkspaceCurrentSession = "/workspaces/{id}/current-session";
export const v1WorkspaceAgent = "/workspaces/{id}/agent";
export const v1WorkspaceAgentMain = "/workspaces/{id}/agent/main";
export const v1WorkspaceAgentUpdate = "/workspaces/{id}/agent/update";
export const v1WorkspaceAgentSessionCancel = "/workspaces/{id}/agent/sessions/{session_id}/cancel";
export const v1WorkspaceAgentSessionSummarize =
	"/workspaces/{id}/agent/sessions/{session_id}/summarize";
export const v1WorkspaceAgentSessionShell =
	"/workspaces/{id}/agent/sessions/{session_id}/shell";
export const v1WorkspaceAgentSessionPromptsClear =
	"/workspaces/{id}/agent/sessions/{session_id}/prompts/clear";
export const v1WorkspaceProjectNeedsInit = "/workspaces/{id}/project/needs-init";
export const v1WorkspaceProjectInit = "/workspaces/{id}/project/init";
export const v1WorkspaceProjectInitPrompt = "/workspaces/{id}/project/init-prompt";
export const v1WorkspaceConfig = "/workspaces/{id}/config";
export const v1WorkspaceConfigModel = "/workspaces/{id}/config/model";
export const v1WorkspaceProviders = "/workspaces/{id}/providers";
export const v1WorkspaceSessionPermissionsPending =
	"/workspaces/{id}/sessions/{sid}/permissions/pending";
export const v1WorkspaceSessionPermissionsSkip =
	"/workspaces/{id}/sessions/{sid}/permissions/skip";
export const v1WorkspaceSessionModel = "/workspaces/{id}/sessions/{sid}/model";
export const v1WorkspacePermissionsGrant = "/workspaces/{id}/permissions/grant";
export const v1WorkspacePermissionsSkip = "/workspaces/{id}/permissions/skip";
export const v1WorkspaceQuestionsAnswer = "/workspaces/{id}/questions/answer";
export const v1WorkspaceQuestionsCancel = "/workspaces/{id}/questions/cancel";

// ---------- vishnu project routing ----------

/**
 * Base of one project's crush surface. vishnu mounts every project's
 * `crush server` under its id, so the same domain SDKs work per project.
 */
export const vishnuProjectBase = "/p/{pid}/v1";

/**
 * Resolves the crush base URL for a selected project. Construct the crush
 * clients per project; the `client_id` query param stays opt-in.
 *
 * @example
 * const api = new ApiClient({
 *   baseUrl: projectBaseUrl(projectId),
 *   defaultQuery: { client_id },
 * });
 * const events = new EventsClient(api);
 * new EventSource(events.url(workspaceId));
 */
export function projectBaseUrl(projectId: string): string {
	return buildPath(vishnuProjectBase, { pid: projectId });
}

// ---------- vishnu API (baseUrl `/api`) ----------

export const vishnuAuthRequestOtp = "/auth/request-otp";
export const vishnuAuthVerify = "/auth/verify";
export const vishnuAuthLogout = "/auth/logout";
export const vishnuAuthMe = "/auth/me";

export const vishnuProjects = "/projects";
export const vishnuProjectById = "/projects/{id}";
export const vishnuProjectWorkspace = "/projects/{id}/workspace";
export const vishnuProjectPermissionsSkip = "/projects/{id}/permissions/skip";
export const vishnuProjectAgent = "/projects/{id}/agent";

export const vishnuUsers = "/users";

/** Public liveness probe — root-relative, so it sits outside the `/api` base. */
export const vishnuHealthz = "/healthz";
