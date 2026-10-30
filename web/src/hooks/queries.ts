import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	agentClient,
	authClient,
	configClient,
	permissionsClient,
	projectsClient,
	questionsClient,
	sessionsClient,
	workspacesClient,
} from "@/services/api";
import { pendingStore } from "@/services/pendingStore";
import type {
	AgentMessage,
	CreateProjectRequest,
	PermissionAction,
	PermissionRequest,
	Project,
	QuestionAnswer,
	ResolvedResponse,
	SelectedModel,
	SelectedModelType,
} from "@vishnu/api-contract";

export const queryKeys = {
	me: ["auth", "me"] as const,
	projects: ["projects"] as const,
	projectWorkspace: (pid: string) => ["projects", pid, "workspace"] as const,
	workspaces: ["workspaces"] as const,
	sessions: (wid: string) => ["sessions", wid] as const,
	messages: (wid: string, sid: string) => ["messages", wid, sid] as const,
	messagesFor: (wid: string) => ["messages", wid] as const,
	agent: (wid: string) => ["agent", wid] as const,
	providers: (wid: string) => ["providers", wid] as const,
	config: (wid: string) => ["config", wid] as const,
	permissionsSkip: (wid: string) => ["permissions-skip", wid] as const,
	pendingPermissions: (wid: string, sid?: string) =>
		sid ? (["pending-permissions", wid, sid] as const) : (["pending-permissions", wid] as const),
	needsInit: (wid: string) => ["needs-init", wid] as const,
};

// ---------- Vishnu control plane ----------

export function useMe() {
	return useQuery({
		queryKey: queryKeys.me,
		queryFn: () => authClient.me(),
		retry: false,
		staleTime: 30_000,
	});
}

export function useRequestOtp() {
	return useMutation({
		mutationKey: ["auth", "request-otp"],
		mutationFn: (email: string) => authClient.requestOtp(email),
	});
}

export function useVerify() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["auth", "verify"],
		mutationFn: ({ email, code }: { email: string; code: string }) =>
			authClient.verify(email, code),
		onSuccess: (user) => qc.setQueryData(queryKeys.me, user),
	});
}

export function useLogout() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["auth", "logout"],
		mutationFn: () => authClient.logout(),
		// Drop the session locally no matter what the server says — a
		// failed or hung logout must not leave the app half-signed-in.
		// Writing null (instead of removing the query) sends the app to
		// the login screen immediately without a refetch flash.
		onSettled: () => qc.setQueryData(queryKeys.me, null),
	});
}

export function useProjects() {
	return useQuery({
		queryKey: queryKeys.projects,
		queryFn: () => projectsClient.list(),
		// Clone rows flip asynchronously; keep the list fresh until the
		// server has finished cloning.
		refetchInterval: (query) =>
			query.state.data?.some((project) => project.status === "cloning") ? 2000 : false,
	});
}

export function useCreateProject() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["projects", "create"],
		mutationFn: (req: CreateProjectRequest) => projectsClient.create(req),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
	});
}

export function useDeleteProject() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["projects", "delete"],
		mutationFn: (id: string) => projectsClient.delete(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
	});
}

export function useProjectWorkspace(projectId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.projectWorkspace(projectId ?? ""),
		queryFn: () => projectsClient.workspace(projectId!),
		enabled: !!projectId,
		staleTime: 0,
		retry: 1,
	});
}

// ---------- Crush queries ----------

export function useWorkspaces() {
	return useQuery({ queryKey: queryKeys.workspaces, queryFn: () => workspacesClient.list() });
}

export function useSessions(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.sessions(wid ?? ""),
		queryFn: () => sessionsClient.list(wid!),
		enabled: !!wid,
		refetchInterval: 30_000,
	});
}

export function useMessages(wid: string | undefined, sid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.messages(wid ?? "", sid ?? ""),
		queryFn: () => sessionsClient.messages(wid!, sid!),
		enabled: !!wid && !!sid,
	});
}

export function useAgentInfo(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.agent(wid ?? ""),
		queryFn: () => agentClient.info(wid!),
		enabled: !!wid,
	});
}

export function useProviders(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.providers(wid ?? ""),
		queryFn: () => configClient.providers(wid!),
		enabled: !!wid,
	});
}

export function useConfig(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.config(wid ?? ""),
		queryFn: () => configClient.get(wid!),
		enabled: !!wid,
	});
}

export function usePermissionsSkip(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.permissionsSkip(wid ?? ""),
		queryFn: () => permissionsClient.getSkip(wid!),
		enabled: !!wid,
	});
}

export function useNeedsInit(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.needsInit(wid ?? ""),
		queryFn: () => workspacesClient.needsInit(wid!),
		enabled: !!wid,
	});
}

// ---------- Mutations ----------

export function useCreateSession(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["sessions", "create"],
		mutationFn: (title?: string) => sessionsClient.create(wid!, title),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions(wid!) }),
	});
}

export function useDeleteSession(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["sessions", "delete"],
		mutationFn: (sid: string) => sessionsClient.delete(wid!, sid),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions(wid!) }),
	});
}

export function useSendPrompt(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "send"],
		mutationFn: (msg: AgentMessage) => agentClient.sendPrompt(wid!, msg),
		onSuccess: (_d, msg) => pendingStore.setBusy(msg.session_id, true),
	});
}

export function useCancelRun(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "cancel"],
		mutationFn: (sid: string) => agentClient.cancelRun(wid!, sid),
		onSuccess: (_d, sid) => pendingStore.setBusy(sid, false),
	});
}

export function useSetMainAgent(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["agent", "set-main"],
		mutationFn: (agentId: string) => agentClient.setMain(wid!, agentId),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agent(wid!) }),
	});
}

/**
 * `PUT /api/projects/{id}/agent` — the persisted main agent. Crush keeps
 * its coordinator on the coder default for every child start, so vishnu
 * stores the choice and replays it whenever it ensures the workspace.
 */
export function useSetProjectAgent(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["projects", "agent"],
		mutationFn: ({ id, agent }: { id: string; agent: string }) =>
			projectsClient.setAgent(id, agent),
		onSuccess: (project) => {
			qc.setQueryData<Project[]>(queryKeys.projects, (old) =>
				old?.map((p) => (p.id === project.id ? project : p)),
			);
			qc.invalidateQueries({ queryKey: queryKeys.agent(wid!) });
		},
	});
}

export function useGrantPermission(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation<
		ResolvedResponse,
		Error,
		{ permission: PermissionRequest; action: PermissionAction }
	>({
		mutationKey: ["permissions", "grant"],
		mutationFn: ({ permission, action }) => permissionsClient.grant(wid!, permission, action),
		onSuccess: (d, { permission }) => {
			pendingStore.removePermission(permission.tool_call_id);
			// resolved:false means the waiter was already gone — the run
			// died while the card sat on screen. Refetch so is_busy
			// reconciliation drops the spinner right away instead of on
			// the next poll.
			if (!d.resolved && wid) {
				qc.invalidateQueries({ queryKey: queryKeys.sessions(wid) });
				qc.invalidateQueries({ queryKey: queryKeys.messages(wid, permission.session_id) });
			}
		},
	});
}

export function useAnswerQuestions(wid: string | undefined) {
	return useMutation<ResolvedResponse, Error, QuestionAnswer>({
		mutationKey: ["questions", "answer"],
		mutationFn: (answer) => questionsClient.answer(wid!, answer),
		onSuccess: (_d, answer) => pendingStore.removeQuestion(answer.batch_request_id),
	});
}

export function useCancelQuestions(wid: string | undefined) {
	return useMutation<ResolvedResponse, Error, string>({
		mutationKey: ["questions", "cancel"],
		mutationFn: () => questionsClient.cancel(wid!),
		onSuccess: (_d, batchId) => pendingStore.removeQuestion(batchId),
	});
}

export function useSetModel(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation<void, Error, { modelType: SelectedModelType; model: SelectedModel }, unknown>({
		mutationKey: ["config", "set-model"],
		mutationFn: async ({ modelType, model }) => {
			await configClient.setModel(wid!, modelType, model);
			// config/model only persists the selection — the coordinator's
			// live model (what GET /agent reports) is rebuilt by agent/update.
			await agentClient.updateModel(wid!);
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: queryKeys.agent(wid!) });
			qc.invalidateQueries({ queryKey: queryKeys.config(wid!) });
		},
	});
}

/**
 * `POST .../sessions/{sid}/model` — pin this room's large model without
 * touching the shared config. `null` clears the pin so the session
 * follows the workspace default again. Applies to the next run.
 */
export function useSetSessionModel(wid: string | undefined, sid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["sessions", "set-model"],
		mutationFn: (model: SelectedModel | null) => sessionsClient.setModel(wid!, sid!, model),
		onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.sessions(wid!) }),
	});
}

/**
 * `/init` — fetch the project's init prompt, dispatch it as a normal
 * agent run, then mark the workspace initialized. Needs a session id to
 * run under, so the caller passes the current session.
 */
export function useInitProject(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["project", "init"],
		mutationFn: async (sid: string) => {
			const { prompt } = await workspacesClient.initPrompt(wid!);
			await agentClient.sendPrompt(wid!, {
				session_id: sid,
				prompt,
				run_id: crypto.randomUUID(),
			});
			await workspacesClient.markInitialized(wid!);
			return sid;
		},
		onSuccess: (sid) => {
			pendingStore.setBusy(sid, true);
			qc.invalidateQueries({ queryKey: queryKeys.needsInit(wid!) });
		},
	});
}

/** `/summarize` — compact the current session. */
export function useSummarize(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "summarize"],
		mutationFn: (sid: string) => agentClient.summarize(wid!, sid),
	});
}

/** `/shell <cmd>` — run a shell command in the workspace. */
export function useRunShell(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "shell"],
		mutationFn: ({ sid, command }: { sid: string; command: string }) =>
			agentClient.runShell(wid!, sid, command),
	});
}

/** `/clear` — drop queued prompts for the session. */
export function useClearPrompts(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "clear-prompts"],
		mutationFn: (sid: string) => agentClient.clearPrompts(wid!, sid),
	});
}

export function useSetPermissionsSkip(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["permissions", "skip"],
		mutationFn: (skip: boolean) => permissionsClient.setSkip(wid!, skip),
		onMutate: async (skip) => {
			await qc.cancelQueries({ queryKey: queryKeys.permissionsSkip(wid!) });
			const previous = qc.getQueryData<{ skip: boolean }>(queryKeys.permissionsSkip(wid!));
			qc.setQueryData(queryKeys.permissionsSkip(wid!), { skip });
			return { previous };
		},
		onError: (_error, _skip, context) => {
			if (context?.previous) {
				qc.setQueryData(queryKeys.permissionsSkip(wid!), context.previous);
			}
		},
		onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.permissionsSkip(wid!) }),
	});
}

/**
 * `PUT /api/projects/{id}/permissions/skip` — the persisted workspace-wide
 * auto-approve default. vishnu stores it and replays it onto the crush
 * server whenever it ensures the workspace, so closing the tab (which
 * recycles that server) no longer resets the setting.
 */
export function useSetProjectPermissionsSkip(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["projects", "permissions", "skip"],
		mutationFn: ({ id, skip }: { id: string; skip: boolean }) =>
			projectsClient.setPermissionSkip(id, skip),
		onSuccess: (project) => {
			qc.setQueryData<Project[]>(queryKeys.projects, (old) =>
				old?.map((p) => (p.id === project.id ? project : p)),
			);
			qc.invalidateQueries({ queryKey: queryKeys.permissionsSkip(wid!) });
		},
	});
}

/** Report the session this tab is viewing (scopes prompt delivery). */
export function useReportCurrentSession(wid: string | undefined) {
	return useMutation<void, Error, string>({
		mutationKey: ["client", "current-session"],
		mutationFn: (sid) => sessionsClient.setCurrent(wid!, sid),
	});
}

/**
 * `POST .../sessions/{sid}/permissions/skip` — arm or disarm this room's
 * auto-approve override, persisted on the session row. `null` clears the
 * override so the session inherits the workspace flag again.
 */
export function useSetSessionPermissionsSkip(wid: string | undefined, sid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["sessions", "permissions", "skip"],
		mutationFn: (skip: boolean | null) => permissionsClient.setSessionSkip(wid!, sid!, skip),
		onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.sessions(wid!) }),
	});
}

/**
 * Authoritative pending-permission list for a session (incl. its
 * sub-agent sessions). Pairs with the SSE-driven pending store: replay
 * re-adds live prompts on reconnect but cannot remove cards whose
 * resolution event was missed — this query is the truth source for
 * both directions. Refetches on mount and when the stream reopens
 * (invalidated in useCrushEvents).
 */
export function usePendingPermissions(wid: string | undefined, sid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.pendingPermissions(wid!, sid!),
		queryFn: () => permissionsClient.pending(wid!, sid!),
		enabled: !!wid && !!sid,
		staleTime: 0,
	});
}
