import { useSyncExternalStore } from "react";
import type { PermissionRequest, QuestionRequest } from "@/types/crush";

/**
 * Tiny external store for SSE-driven UI state that doesn't belong in
 * the query cache: pending permission/question prompts, per-session
 * busy flags, and the event-stream connection state.
 */

export type ConnState = "connecting" | "open" | "closed";

export interface PendingState {
	permissions: PermissionRequest[];
	questions: QuestionRequest[];
	busy: Record<string, boolean>;
	conn: ConnState;
}

let state: PendingState = {
	permissions: [],
	questions: [],
	busy: {},
	conn: "connecting",
};

const listeners = new Set<() => void>();

function emit() {
	for (const l of listeners) l();
}

function set(patch: Partial<PendingState>) {
	state = { ...state, ...patch };
	emit();
}

export const pendingStore = {
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	},
	getSnapshot() {
		return state;
	},

	addPermission(req: PermissionRequest) {
		set({ permissions: [...state.permissions.filter((p) => p.id !== req.id), req] });
	},
	removePermission(toolCallId: string) {
		set({ permissions: state.permissions.filter((p) => p.tool_call_id !== toolCallId) });
	},
	addQuestion(req: QuestionRequest) {
		set({ questions: [...state.questions.filter((q) => q.id !== req.id), req] });
	},
	removeQuestion(batchId: string) {
		set({ questions: state.questions.filter((q) => q.id !== batchId) });
	},
	setBusy(sessionId: string, busy: boolean) {
		set({ busy: { ...state.busy, [sessionId]: busy } });
	},
	setConn(conn: ConnState) {
		set({ conn });
	},
};

export function usePendingState(): PendingState {
	return useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot);
}
