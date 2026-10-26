import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
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
import { queryKeys, useSessions } from "@/hooks/queries";

/**
 * Attaches the workspace SSE stream and fans events out to the query
 * cache + pending store. EventSource auto-reconnects on error.
 */
export function useCrushEvents(workspaceId: string | undefined) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const sessions = useSessions(workspaceId);
	const lastHeal = useRef(0);

	// The busy map is optimistic: if the stream drops mid-run (proxy
	// timeout, tab suspend) run_complete is never seen and the flag
	// sticks. Sessions carry crush's computed is_busy, so every list
	// refresh — initial load, reconnect catch-up, session events —
	// resets the map to server truth.
	useEffect(() => {
		if (!sessions.data) return;
		pendingStore.reconcileBusy(
			Object.fromEntries(sessions.data.map((s) => [s.id, s.is_busy])),
		);
	}, [sessions.data]);

	useEffect(() => {
		if (!workspaceId) return;

		const es = new EventSource(eventsClient.url(workspaceId));
		es.onopen = () => {
			pendingStore.setConn("open");
			// Catch up after a reconnect: runs continue server-side while
			// the tab is suspended, so the stream alone may have missed
			// messages.
			queryClient.invalidateQueries({ queryKey: queryKeys.messagesFor(workspaceId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.sessions(workspaceId) });
		};
		// EventSource retries on its own; show that as reconnecting
		// instead of a permanent disconnect.
		es.onerror = () => {
			pendingStore.setConn("connecting");
			// A workspace dies with its crush child and is re-created under
			// a fresh id — the loader-cached wid then 404s forever. Re-run
			// the route loader (throttled) so a stale wid self-heals.
			if (Date.now() - lastHeal.current > 15_000) {
				lastHeal.current = Date.now();
				void router.invalidate();
			}
		};

		es.onmessage = (evt) => {
			let envelope: EventPayload;
			try {
				envelope = JSON.parse(evt.data) as EventPayload;
			} catch {
				return;
			}
			// Crush wraps every event's entity in a pubsub envelope:
			// {"type":"message","payload":{"type":"created","payload":{…}}}.
			// Unwrap it — the mock server sends the entity un-nested.
			const inner = envelope.payload as { type?: unknown; payload?: unknown };
			const wrapped =
				inner !== null &&
				typeof inner === "object" &&
				(inner.type === "created" || inner.type === "updated" || inner.type === "deleted")
					? inner.payload
					: envelope.payload;
			dispatch(workspaceId, envelope.type, wrapped, inner?.type, queryClient);
		};

		return () => {
			es.close();
			pendingStore.setConn("closed");
		};
	}, [workspaceId, queryClient]);
}

function dispatch(
	workspaceId: string,
	type: string,
	payload: unknown,
	innerType: unknown,
	queryClient: QueryClient,
) {
	switch (type) {
		case "message": {
			const msg = payload as Message;
			if (!msg?.session_id) break;
			queryClient.setQueryData<Message[]>(
				queryKeys.messages(workspaceId, msg.session_id),
				(old) =>
					innerType === "deleted"
						? (old ?? []).filter((m) => m.id !== msg.id)
						: mergeMessage(old ?? [], msg),
			);
			if (innerType !== "deleted") pendingStore.setBusy(msg.session_id, true);
			break;
		}
		case "session": {
			const s = payload as Session;
			if (!s?.id) break;
			queryClient.setQueryData<Session[]>(queryKeys.sessions(workspaceId), (old) => {
				const next = old ?? [];
				const i = next.findIndex((x) => x.id === s.id);
				if (innerType === "deleted") return i === -1 ? next : next.filter((x) => x.id !== s.id);
				if (i === -1) return [...next, s];
				const copy = [...next];
				copy[i] = { ...copy[i], ...s };
				return copy;
			});
			break;
		}
		case "agent_event": {
			const ev = payload as AgentEvent;
			const sid = ev.session_id ?? ev.message?.session_id;
			if (!sid) break;
			if (ev.type === "error" || ev.done) pendingStore.setBusy(sid, false);
			else pendingStore.setBusy(sid, true);
			break;
		}
		case "permission_request":
			pendingStore.addPermission(payload as PermissionRequest);
			break;
		case "permission_notification":
			pendingStore.removePermission((payload as PermissionNotification).tool_call_id);
			break;
		case "question_batch_request":
			pendingStore.addQuestion(payload as QuestionRequest);
			break;
		case "question_batch_notification":
			pendingStore.removeQuestion((payload as QuestionNotification).batch_id);
			break;
		case "run_complete": {
			const rc = payload as RunComplete;
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
			queryClient.invalidateQueries({ queryKey: queryKeys.permissionsSkip(workspaceId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.needsInit(workspaceId) });
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
