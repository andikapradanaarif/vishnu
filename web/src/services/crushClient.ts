import type {
	AgentInfo,
	AgentMessage,
	ConfigModelRequest,
	CrushConfig,
	Message,
	PermissionAction,
	PermissionRequest,
	PermissionSkipRequest,
	ProviderConfig,
	QuestionAnswer,
	ResolvedResponse,
	SelectedModel,
	SelectedModelType,
	Session,
	Workspace,
} from "@/types/crush";

/**
 * Typed client for the `crush server` HTTP API. All calls go to
 * same-origin `/v1/*` — the dev-server or the Go proxy forwards them.
 */

export class ApiError extends Error {
	readonly status: number;
	readonly body: { message?: string } | null;

	constructor(status: number, body: { message?: string } | null) {
		super(body?.message ?? `Request failed (${status})`);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	const res = await fetch(`/v1${path}`, { ...init, headers });
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		throw new ApiError(res.status, body);
	}
	if (res.status === 204 || res.headers.get("content-length") === "0") {
		return undefined as T;
	}
	return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
	request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const crush = {
	// Workspaces & sessions.
	listWorkspaces: () => request<Workspace[]>("/workspaces"),
	listSessions: (wid: string) => request<Session[]>(`/workspaces/${wid}/sessions`),
	getSession: (wid: string, sid: string) =>
		request<Session>(`/workspaces/${wid}/sessions/${sid}`),
	createSession: (wid: string, title?: string) =>
		post<Session>(`/workspaces/${wid}/sessions`, { title }),
	deleteSession: (wid: string, sid: string) =>
		request<void>(`/workspaces/${wid}/sessions/${sid}`, { method: "DELETE" }),
	getMessages: (wid: string, sid: string) =>
		request<Message[]>(`/workspaces/${wid}/sessions/${sid}/messages`),

	// Which session this client is viewing (scopes permission/question
	// delivery). client_id rides as a query param.
	setCurrentSession: (wid: string, client: string, sessionId: string) =>
		post<void>(`/workspaces/${wid}/current-session?client_id=${client}`, {
			session_id: sessionId,
		}),

	// Agent runs — POST returns 202; the run lives server-side.
	sendPrompt: (wid: string, msg: AgentMessage) => post<void>(`/workspaces/${wid}/agent`, msg),
	cancelRun: (wid: string, sid: string) =>
		post<void>(`/workspaces/${wid}/agent/sessions/${sid}/cancel`),
	getAgentInfo: (wid: string) => request<AgentInfo>(`/workspaces/${wid}/agent`),
	setMainAgent: (wid: string, agentId: string) =>
		post<void>(`/workspaces/${wid}/agent/main`, { agent_id: agentId }),

	// Permissions.
	grantPermission: (wid: string, permission: PermissionRequest, action: PermissionAction) =>
		post<ResolvedResponse>(`/workspaces/${wid}/permissions/grant`, { permission, action }),
	getPermissionsSkip: (wid: string) =>
		request<PermissionSkipRequest>(`/workspaces/${wid}/permissions/skip`),
	setPermissionsSkip: (wid: string, skip: boolean) =>
		post<void>(`/workspaces/${wid}/permissions/skip`, { skip } satisfies PermissionSkipRequest),

	// Question tool batches.
	answerQuestions: (wid: string, answer: QuestionAnswer) =>
		post<ResolvedResponse>(`/workspaces/${wid}/questions/answer`, answer),
	cancelQuestions: (wid: string) => post<ResolvedResponse>(`/workspaces/${wid}/questions/cancel`),

	// Workspace config (agents + selected models).
	getConfig: (wid: string) => request<CrushConfig>(`/workspaces/${wid}/config`),

	// Models & providers.
	getProviders: (wid: string) => request<ProviderConfig[]>(`/workspaces/${wid}/providers`),
	setModel: (wid: string, modelType: SelectedModelType, model: SelectedModel) =>
		post<void>(`/workspaces/${wid}/config/model`, {
			scope: 1,
			model_type: modelType,
			model,
		} satisfies ConfigModelRequest),

	// SSE endpoint — consumed via EventSource, not fetch.
	eventsUrl: (wid: string, client: string) =>
		`/v1/workspaces/${wid}/events?client_id=${encodeURIComponent(client)}`,
};
