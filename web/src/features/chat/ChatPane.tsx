import { useEffect, useRef } from "react";
import { EmptyState } from "@vishnu/ui-component/emptyState";
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
					<div className="py-10 text-center font-display text-lg text-on-surface-muted">
						<span className="blink text-primary-400">▊</span> loading transcript…
					</div>
				)}
				{error && (
					<p className="py-4 text-center font-display text-sm text-danger-400">
						{error.message}
					</p>
				)}
				{!isLoading && (messages ?? []).length === 0 && (
					<EmptyState
						text="No messages yet — send a prompt to start"
						className="py-16 font-display text-lg"
					/>
				)}

				{(messages ?? []).map((m) => (
					<MessageView key={m.id} message={m} />
				))}

				{busy[sid] && (
					<div className="flex items-center gap-2 font-display text-sm text-on-surface-muted">
						<span className="blink text-primary-400">▊</span>
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
			<div className="self-end max-w-[85%] border-2 border-pink-500/60 bg-pink-500/10 px-3.5 py-2">
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
				<div className="mt-0.5 font-display text-[10px] text-ghost">{message.model}</div>
			)}
		</div>
	);
}
