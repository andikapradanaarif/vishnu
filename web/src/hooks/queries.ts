import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crush } from "@/services/crushClient";
import { clientId } from "@/services/clientId";
import { pendingStore } from "@/services/pendingStore";
import type {
	AgentMessage,
	PermissionAction,
	PermissionRequest,
	QuestionAnswer,
	ResolvedResponse,
	SelectedModel,
	SelectedModelType,
} from "@/types/crush";

export const queryKeys = {
	workspaces: ["workspaces"] as const,
	sessions: (wid: string) => ["sessions", wid] as const,
	messages: (wid: string, sid: string) => ["messages", wid, sid] as const,
	agent: (wid: string) => ["agent", wid] as const,
	providers: (wid: string) => ["providers", wid] as const,
	config: (wid: string) => ["config", wid] as const,
	permissionsSkip: (wid: string) => ["permissions-skip", wid] as const,
};

// ---------- Queries ----------

export function useWorkspaces() {
	return useQuery({ queryKey: queryKeys.workspaces, queryFn: () => crush.listWorkspaces() });
}

export function useSessions(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.sessions(wid ?? ""),
		queryFn: () => crush.listSessions(wid!),
		enabled: !!wid,
		refetchInterval: 30_000,
	});
}

export function useMessages(wid: string | undefined, sid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.messages(wid ?? "", sid ?? ""),
		queryFn: () => crush.getMessages(wid!, sid!),
		enabled: !!wid && !!sid,
	});
}

export function useAgentInfo(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.agent(wid ?? ""),
		queryFn: () => crush.getAgentInfo(wid!),
		enabled: !!wid,
	});
}

export function useProviders(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.providers(wid ?? ""),
		queryFn: () => crush.getProviders(wid!),
		enabled: !!wid,
	});
}

export function useConfig(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.config(wid ?? ""),
		queryFn: () => crush.getConfig(wid!),
		enabled: !!wid,
	});
}

export function usePermissionsSkip(wid: string | undefined) {
	return useQuery({
		queryKey: queryKeys.permissionsSkip(wid ?? ""),
		queryFn: () => crush.getPermissionsSkip(wid!),
		enabled: !!wid,
	});
}

// ---------- Mutations ----------

export function useCreateSession(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["sessions", "create"],
		mutationFn: (title?: string) => crush.createSession(wid!, title),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions(wid!) }),
	});
}

export function useDeleteSession(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["sessions", "delete"],
		mutationFn: (sid: string) => crush.deleteSession(wid!, sid),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions(wid!) }),
	});
}

export function useSendPrompt(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "send"],
		mutationFn: (msg: AgentMessage) => crush.sendPrompt(wid!, msg),
		onSuccess: (_d, msg) => pendingStore.setBusy(msg.session_id, true),
	});
}

export function useCancelRun(wid: string | undefined) {
	return useMutation({
		mutationKey: ["agent", "cancel"],
		mutationFn: (sid: string) => crush.cancelRun(wid!, sid),
		onSuccess: (_d, sid) => pendingStore.setBusy(sid, false),
	});
}

export function useSetMainAgent(wid: string | undefined) {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: ["agent", "set-main"],
		mutationFn: (agentId: string) => crush.setMainAgent(wid!, agentId),
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
		mutationFn: ({ permission, action }) => crush.grantPermission(wid!, permission, action),
		onSuccess: (_d, { permission }) => pendingStore.removePermission(permission.tool_call_id),
	});
}

export function useAnswerQuestions(wid: string | undefined) {
	return useMutation<ResolvedResponse, Error, QuestionAnswer>({
		mutationKey: ["questions", "answer"],
		mutationFn: (answer) => crush.answerQuestions(wid!, answer),
		onSuccess: (_d, answer) => pendingStore.removeQuestion(answer.batch_request_id),
	});
}

export function useCancelQuestions(wid: string | undefined) {
	return useMutation<ResolvedResponse, Error, string>({
		mutationKey: ["questions", "cancel"],
		mutationFn: () => crush.cancelQuestions(wid!),
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
		mutationFn: ({ modelType, model }) => crush.setModel(wid!, modelType, model),
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
		mutationFn: (skip: boolean) => crush.setPermissionsSkip(wid!, skip),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: queryKeys.permissionsSkip(wid!) }),
	});
}

/** Report the session this tab is viewing (scopes prompt delivery). */
export function useReportCurrentSession(wid: string | undefined) {
	return useMutation<void, Error, string>({
		mutationKey: ["client", "current-session"],
		mutationFn: (sid) => crush.setCurrentSession(wid!, clientId(), sid),
	});
}
