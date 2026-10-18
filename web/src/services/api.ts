import { ApiClient } from "@vishnu/api-contract/client";
import { AgentClient } from "@vishnu/api-contract/agent";
import { ConfigClient } from "@vishnu/api-contract/config";
import { EventsClient } from "@vishnu/api-contract/events";
import { PermissionsClient } from "@vishnu/api-contract/permissions";
import { QuestionsClient } from "@vishnu/api-contract/questions";
import { SessionsClient } from "@vishnu/api-contract/sessions";
import { WorkspacesClient } from "@vishnu/api-contract/workspaces";
import { clientId } from "./clientId";

/**
 * Shared API client — same-origin `/v1` (dev-server or Go proxy forwards
 * to crush). `client_id` (per-tab UUID) rides on every request; crush
 * uses it to scope permission/question delivery and SSE streams.
 */
export const apiClient = new ApiClient({
	baseUrl: "/v1",
	defaultQuery: { client_id: clientId() },
});

export const workspacesClient = new WorkspacesClient(apiClient);
export const sessionsClient = new SessionsClient(apiClient);
export const agentClient = new AgentClient(apiClient);
export const configClient = new ConfigClient(apiClient);
export const permissionsClient = new PermissionsClient(apiClient);
export const questionsClient = new QuestionsClient(apiClient);
export const eventsClient = new EventsClient(apiClient);
