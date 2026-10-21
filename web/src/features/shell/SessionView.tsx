import { useEffect } from "react";
import { useReportCurrentSession } from "@/hooks/queries";
import { usePendingState } from "@/services/pendingStore";
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

	// Tell the server which session this tab is viewing so permission and
	// question prompts are scoped to it.
	useEffect(() => {
		reportCurrent.mutate(sessionId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sessionId, wid]);

	return (
		<>
			<ChatPane wid={wid} sid={sessionId} />
			<Composer wid={wid} sid={sessionId} busy={!!busy[sessionId]} />
		</>
	);
}
