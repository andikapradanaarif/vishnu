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
export const v1Workspaces = "/workspaces";
export const v1WorkspaceById = "/workspaces/{id}";
export const v1WorkspaceSessions = "/workspaces/{id}/sessions";
export const v1WorkspaceSessionById = "/workspaces/{id}/sessions/{session_id}";
export const v1WorkspaceSessionMessages = "/workspaces/{id}/sessions/{session_id}/messages";
export const v1WorkspaceEvents = "/workspaces/{id}/events";
export const v1WorkspaceCurrentSession = "/workspaces/{id}/current-session";
export const v1WorkspaceAgent = "/workspaces/{id}/agent";
export const v1WorkspaceAgentMain = "/workspaces/{id}/agent/main";
export const v1WorkspaceAgentSessionCancel = "/workspaces/{id}/agent/sessions/{session_id}/cancel";
export const v1WorkspaceConfig = "/workspaces/{id}/config";
export const v1WorkspaceConfigModel = "/workspaces/{id}/config/model";
export const v1WorkspaceProviders = "/workspaces/{id}/providers";
export const v1WorkspacePermissionsGrant = "/workspaces/{id}/permissions/grant";
export const v1WorkspacePermissionsSkip = "/workspaces/{id}/permissions/skip";
export const v1WorkspaceQuestionsAnswer = "/workspaces/{id}/questions/answer";
export const v1WorkspaceQuestionsCancel = "/workspaces/{id}/questions/cancel";
