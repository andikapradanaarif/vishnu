import { buildPath, type ApiClient } from "../client";
import {
	v1WorkspaceCurrentSession,
	v1WorkspaceSessionById,
	v1WorkspaceSessionMessages,
	v1WorkspaceSessions,
} from "../paths";
import type { Message, Session } from "../types";

/**
 * SDK client for the `/workspaces/{id}/sessions` endpoints.
 */
export class SessionsClient {
	private readonly api: ApiClient;

	constructor(api: ApiClient) {
		this.api = api;
	}

	/** GET `/workspaces/{id}/sessions` — list sessions. */
	list(workspaceId: string): Promise<Session[]> {
		return this.api.get<Session[]>(buildPath(v1WorkspaceSessions, { id: workspaceId }));
	}

	/** GET `/workspaces/{id}/sessions/{session_id}` — get a session. */
	get(workspaceId: string, sessionId: string): Promise<Session> {
		return this.api.get<Session>(
			buildPath(v1WorkspaceSessionById, { id: workspaceId, session_id: sessionId }),
		);
	}

	/** POST `/workspaces/{id}/sessions` — create a session with a title. */
	create(workspaceId: string, title?: string): Promise<Session> {
		return this.api.post<Session>(
			buildPath(v1WorkspaceSessions, { id: workspaceId }),
			{ title },
		);
	}

	/** DELETE `/workspaces/{id}/sessions/{session_id}` — delete a session. */
	delete(workspaceId: string, sessionId: string): Promise<void> {
		return this.api.delete<void>(
			buildPath(v1WorkspaceSessionById, { id: workspaceId, session_id: sessionId }),
		);
	}

	/** GET `/workspaces/{id}/sessions/{session_id}/messages` — full history. */
	messages(workspaceId: string, sessionId: string): Promise<Message[]> {
		return this.api.get<Message[]>(
			buildPath(v1WorkspaceSessionMessages, { id: workspaceId, session_id: sessionId }),
		);
	}

	/**
	 * POST `/workspaces/{id}/current-session` — records which session this
	 * client is viewing (scopes permission/question delivery). `client_id`
	 * rides via the ApiClient defaultQuery.
	 */
	setCurrent(workspaceId: string, sessionId: string): Promise<void> {
		return this.api.post<void>(
			buildPath(v1WorkspaceCurrentSession, { id: workspaceId }),
			{ session_id: sessionId },
		);
	}
}
