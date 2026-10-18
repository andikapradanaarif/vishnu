import { useEffect, useRef } from "react";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { useMessages } from "@/hooks/queries";
import { usePendingState } from "@/services/pendingStore";
import type { Message } from "@vishnu/api-contract";
import { MessagePart } from "./MessageParts";

interface ChatPaneProps {
	wid: string;
	sid: string;
}

export function ChatPane({ wid, sid }: ChatPaneProps) {
	const { data: messages, isLoading, error } = useMessages(wid, sid);
	const { busy } = usePendingState();
	const scrollRef = useRef<HTMLDivElement>(null);
	const pinned = useRef(true);

	// Keep the transcript pinned to the bottom while streaming unless the
	// user has scrolled up.
	useEffect(() => {
		if (pinned.current && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const onScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
	};

	return (
		<div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-4 sm:px-6">
				{isLoading && (
					<div className="flex justify-center py-10">
						<LoadingSpinner size={22} />
					</div>
				)}
				{error && (
					<p className="py-4 text-center text-sm text-red-400">{error.message}</p>
				)}
				{!isLoading && (messages ?? []).length === 0 && (
					<EmptyState text="No messages yet — send a prompt to start" className="py-16" />
				)}

				{(messages ?? []).map((m) => (
					<MessageView key={m.id} message={m} />
				))}

				{busy[sid] && (
					<div className="flex items-center gap-2 text-xs text-neutral-500">
						<LoadingSpinner size={14} />
						agent is working…
					</div>
				)}
			</div>
		</div>
	);
}

function MessageView({ message }: { message: Message }) {
	if (message.role === "user") {
		return (
			<div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-primary-600/25 px-3.5 py-2">
				{message.parts.map((p, i) => (
					<MessagePart key={i} part={p} role={message.role} />
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{message.parts.map((p, i) => (
				<MessagePart key={i} part={p} role={message.role} />
			))}
			{message.model && (
				<div className="mt-0.5 text-[10px] text-neutral-600">{message.model}</div>
			)}
		</div>
	);
}
