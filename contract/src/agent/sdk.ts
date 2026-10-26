import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceAgent,
	v1WorkspaceAgentMain,
	v1WorkspaceAgentSessionCancel,
	v1WorkspaceAgentSessionPromptsClear,
	v1WorkspaceAgentSessionShell,
	v1WorkspaceAgentSessionSummarize,
	v1WorkspaceAgentUpdate,
} from "../paths";
import type { AgentInfo, AgentMessage, ShellCommandResponse } from "../types";

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

	/**
	 * POST `/workspaces/{id}/agent/update` — rebuild the coordinator's
	 * models from the persisted config. Required after `config/model`:
	 * the write only persists the selection, so the live agent (and
	 * `GET /agent`) keeps the old model until this runs.
	 */
	updateModel(workspaceId: string): Promise<void> {
		return this.api.post<void>(buildPath(v1WorkspaceAgentUpdate, { id: workspaceId }));
	}

	/** POST `/workspaces/{id}/agent/main` — switch the main agent (coder/plan/task). */
	setMain(workspaceId: string, agentId: string): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceAgentMain, { id: workspaceId }),
			{ agent_id: agentId },
		);
	}

	/** POST `/workspaces/{id}/agent/sessions/{session_id}/summarize` — compact the session. */
	summarize(workspaceId: string, sessionId: string): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceAgentSessionSummarize, {
				id: workspaceId,
				session_id: sessionId,
			}),
		);
	}

	/**
	 * POST `/workspaces/{id}/agent/sessions/{session_id}/shell` — run a
	 * shell command in the workspace and get `{output, exit_code}` back.
	 */
	runShell(workspaceId: string, sessionId: string, command: string): Promise<ShellCommandResponse> {
		return this.api.post<ShellCommandResponse>(
			buildPath(v1WorkspaceAgentSessionShell, { id: workspaceId, session_id: sessionId }),
			{ session_id: sessionId, command },
		);
	}

	/** POST `/workspaces/{id}/agent/sessions/{session_id}/prompts/clear` — drop queued prompts. */
	clearPrompts(workspaceId: string, sessionId: string): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceAgentSessionPromptsClear, {
				id: workspaceId,
				session_id: sessionId,
			}),
		);
	}
}
