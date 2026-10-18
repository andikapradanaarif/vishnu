import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { eventsClient } from "@/services/api";
import { pendingStore } from "@/services/pendingStore";
import type {
	AgentEvent,
	EventPayload,
	Message,
	PermissionNotification,
	PermissionRequest,
	QuestionNotification,
	QuestionRequest,
	RunComplete,
	Session,
} from "@vishnu/api-contract";
import { queryKeys } from "@/hooks/queries";

/**
 * Attaches the workspace SSE stream and fans events out to the query
 * cache + pending store. EventSource auto-reconnects on error.
 */
export function useCrushEvents(workspaceId: string | undefined) {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!workspaceId) return;

		const es = new EventSource(eventsClient.url(workspaceId));
		es.onopen = () => pendingStore.setConn("open");
		es.onerror = () => pendingStore.setConn("closed");

		es.onmessage = (evt) => {
			let envelope: EventPayload;
			try {
				envelope = JSON.parse(evt.data) as EventPayload;
			} catch {
				return;
			}
			dispatch(workspaceId, envelope, queryClient);
		};

		return () => {
			es.close();
			pendingStore.setConn("closed");
		};
	}, [workspaceId, queryClient]);
}

function dispatch(workspaceId: string, evt: EventPayload, queryClient: QueryClient) {
	switch (evt.type) {
		case "message": {
			const msg = evt.payload as Message;
			queryClient.setQueryData<Message[]>(
				queryKeys.messages(workspaceId, msg.session_id),
				(old) => mergeMessage(old ?? [], msg),
			);
			pendingStore.setBusy(msg.session_id, true);
			break;
		}
		case "session": {
			const s = evt.payload as Session;
			queryClient.setQueryData<Session[]>(queryKeys.sessions(workspaceId), (old) => {
				const next = old ?? [];
				const i = next.findIndex((x) => x.id === s.id);
				if (i === -1) return [...next, s];
				const copy = [...next];
				copy[i] = { ...copy[i], ...s };
				return copy;
			});
			break;
		}
		case "agent_event": {
			const ev = evt.payload as AgentEvent;
			const sid = ev.session_id ?? ev.message?.session_id;
			if (!sid) break;
			if (ev.type === "error" || ev.done) pendingStore.setBusy(sid, false);
			else pendingStore.setBusy(sid, true);
			break;
		}
		case "permission_request":
			pendingStore.addPermission(evt.payload as PermissionRequest);
			break;
		case "permission_notification":
			pendingStore.removePermission((evt.payload as PermissionNotification).tool_call_id);
			break;
		case "question_batch_request":
			pendingStore.addQuestion(evt.payload as QuestionRequest);
			break;
		case "question_batch_notification":
			pendingStore.removeQuestion((evt.payload as QuestionNotification).batch_id);
			break;
		case "run_complete": {
			const rc = evt.payload as RunComplete;
			pendingStore.setBusy(rc.session_id, false);
			queryClient.invalidateQueries({
				queryKey: queryKeys.messages(workspaceId, rc.session_id),
			});
			queryClient.invalidateQueries({ queryKey: queryKeys.sessions(workspaceId) });
			break;
		}
		case "config_changed":
			queryClient.invalidateQueries({ queryKey: queryKeys.agent(workspaceId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.providers(workspaceId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.config(workspaceId) });
			break;
		default:
			break;
	}
}

/** Replace-or-append a message snapshot by id, ordered by created_at. */
function mergeMessage(list: Message[], msg: Message): Message[] {
	const i = list.findIndex((m) => m.id === msg.id);
	const next = i === -1 ? [...list, msg] : list.map((m) => (m.id === msg.id ? msg : m));
	return next.sort((a, b) => a.created_at - b.created_at);
}
