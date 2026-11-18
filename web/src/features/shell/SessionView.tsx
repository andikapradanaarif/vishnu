import { useEffect } from "react";
import { usePendingPermissions, useReportCurrentSession, useSessions } from "@/hooks/queries";
import { pendingStore, usePendingState } from "@/services/pendingStore";
import { descendantsOf } from "@/utils/sessions";
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
