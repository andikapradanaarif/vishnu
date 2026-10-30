import { useEffect } from "react";
import { usePendingPermissions, useReportCurrentSession, useSessions } from "@/hooks/queries";
import { pendingStore, usePendingState } from "@/services/pendingStore";
import { ChatPane } from "@/features/chat/ChatPane";
import { Composer } from "@/features/chat/Composer";

interface SessionViewProps {
	wid: string;
	sessionId: string;
}

/** The transcript (incl. pending prompts) + composer for one routed session. */
export function SessionView({ wid, sessionId }: SessionViewProps) {
	const { busy } = usePendingState();
	const reportCurrent = useReportCurrentSession(wid);
	const sessions = useSessions(wid);
	const pending = usePendingPermissions(wid, sessionId);

	// Tell the server which session this tab is viewing so permission and
	// question prompts are scoped to it.
	useEffect(() => {
		reportCurrent.mutate(sessionId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId, wid]);

	// Reconcile permission cards against the pending endpoint — SSE
	// replay re-adds live prompts but can't drop zombie cards whose
	// resolution event was missed while the stream was down.
	useEffect(() => {
		if (!pending.data || !sessions.data) return;
		pendingStore.reconcilePermissions(descendantsOf(sessions.data, sessionId), pending.data);
	}, [pending.data, sessions.data, sessionId]);

	return (
		<>
			<ChatPane wid={wid} sid={sessionId} />
			<Composer wid={wid} sid={sessionId} busy={!!busy[sessionId]} />
		</>
	);
}

/**
 * Session ids the pending endpoint's response covers: the session
 * itself plus every transitive sub-agent session (it reports their
 * requests under their own session ids).
 */
function descendantsOf(
	sessions: { id: string; parent_session_id: string }[],
	rootId: string,
): ReadonlySet<string> {
	const covered = new Set([rootId]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const s of sessions) {
			if (!covered.has(s.id) && covered.has(s.parent_session_id)) {
				covered.add(s.id);
				grew = true;
			}
		}
	}
	return covered;
}
