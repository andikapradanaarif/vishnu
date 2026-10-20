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
		onSuccess: () => qc.removeQueries({ queryKey: queryKeys.me }),
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

export function useGrantPermission(wid: string | undefined) {
	return useMutation<
		ResolvedResponse,
		Error,
		{ permission: PermissionRequest; action: PermissionAction }
	>({
		mutationKey: ["permissions", "grant"],
		mutationFn: ({ permission, action }) => permissionsClient.grant(wid!, permission, action),
		onSuccess: (_d, { permission }) => pendingStore.removePermission(permission.tool_call_id),
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
	return useMutation<
		void,
		Error,
		{ modelType: SelectedModelType; model: SelectedModel },
		unknown
	>({
		mutationKey: ["config", "set-model"],
		mutationFn: ({ modelType, model }) => configClient.setModel(wid!, modelType, model),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.agent(wid!) });
			qc.invalidateQueries({ queryKey: queryKeys.config(wid!) });
		},
	});
}

export function useSetPermissionsSkip(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["permissions", "skip"],
		mutationFn: (skip: boolean) => permissionsClient.setSkip(wid!, skip),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: queryKeys.permissionsSkip(wid!) }),
	});
}

/** Report the session this tab is viewing (scopes prompt delivery). */
export function useReportCurrentSession(wid: string | undefined) {
	return useMutation<void, Error, string>({
		mutationKey: ["client", "current-session"],
		mutationFn: (sid) => sessionsClient.setCurrent(wid!, sid),
	});
}
