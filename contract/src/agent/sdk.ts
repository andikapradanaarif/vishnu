import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceAgent,
	v1WorkspaceAgentMain,
	v1WorkspaceAgentSessionCancel,
} from "../paths";
import type { AgentInfo, AgentMessage } from "../types";

/**
 * SDK client for the `/workspaces/{id}/agent` endpoints — detached runs,
 * cancellation, agent info, and main-agent switching.
 */
export class AgentClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/**
	 * POST `/workspaces/{id}/agent` — send a prompt. Returns 202; the run
	 * lives server-side and progress arrives over the SSE stream.
	 */
	sendPrompt(workspaceId: string, msg: AgentMessage): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspaceAgent, { id: workspaceId }), msg);
	}

	/** POST `/workspaces/{id}/agent/sessions/{session_id}/cancel` — stop a run. */
	cancelRun(workspaceId: string, sessionId: string): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceAgentSessionCancel, { id: workspaceId, session_id: sessionId }),
		);
	}

	/** GET `/workspaces/{id}/agent` — busy state + selected model. */
	info(workspaceId: string): Promise<AgentInfo> {
		return this.api.get<AgentInfo>(buildPath(v1WorkspaceAgent, { id: workspaceId }));
	}

	/** POST `/workspaces/{id}/agent/main` — switch the main agent (coder/plan/task). */
	setMain(workspaceId: string, agentId: string): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceAgentMain, { id: workspaceId }),
			{ agent_id: agentId },
		);
	}
}
