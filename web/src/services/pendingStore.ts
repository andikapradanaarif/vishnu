import { useSyncExternalStore } from "react";
import type { PermissionRequest, QuestionRequest } from "@vishnu/api-contract";

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
	/**
	 * Authoritative reconcile for one session tree against the pending
	 * endpoint's response: upsert live requests and drop stored cards
	 * under `coveredIds` (the session plus its descendants — the
	 * endpoint reports sub-agent requests too) that the server no
	 * longer lists. Cards for other sessions are untouched.
	 */
	reconcilePermissions(coveredIds: ReadonlySet<string>, requests: PermissionRequest[]) {
		const live = new Set(requests.map((r) => r.id));
		const byId = new Map(state.permissions.map((p) => [p.id, p]));
		for (const r of requests) byId.set(r.id, r);
		const next = [...byId.values()].filter(
			(p) => !coveredIds.has(p.session_id) || live.has(p.id),
		);
		if (next.length !== state.permissions.length || next.some((p, i) => p !== state.permissions[i])) {
			set({ permissions: next });
		}
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
	/**
	 * Fold the server's `is_busy` values into the optimistic map and
	 * drop flags for sessions that no longer exist — this is what lets
	 * a run_complete missed while the stream was disconnected (tab
	 * suspended, reconnect, proxy timeout) un-stick the spinner.
	 */
	reconcileBusy(truth: Record<string, boolean>) {
		const busy = { ...state.busy };
		let changed = false;
		for (const [sid, v] of Object.entries(truth)) {
			if (busy[sid] !== v) {
				busy[sid] = v;
				changed = true;
			}
		}
		for (const sid of Object.keys(busy)) {
			if (!(sid in truth) && busy[sid]) {
				delete busy[sid];
				changed = true;
			}
		}
		if (changed) set({ busy });
	},
	setConn(conn: ConnState) {
		set({ conn });
	},
	reset() {
		set({ permissions: [], questions: [], busy: {}, conn: "connecting" });
	},
};

export function usePendingState(): PendingState {
	return useSyncExternalStore(pendingStore.subscribe, pendingStore.getSnapshot);
}
