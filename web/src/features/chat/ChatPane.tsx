import { useEffect, useRef } from "react";
import { Button } from "@vishnu/ui-component/button";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { useMessages } from "@/hooks/queries";
import { usePendingState } from "@/services/pendingStore";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { errorLabel } from "@/utils/errors";
import type { Message } from "@vishnu/api-contract";
import { MessagePart } from "./MessageParts";
import { PermissionCard } from "@/features/prompts/PermissionCard";
import { QuestionCard } from "@/features/prompts/QuestionCard";

interface ChatPaneProps {
	wid: string;
	sid: string;
}

export function ChatPane({ wid, sid }: ChatPaneProps) {
	const { data: messages, isLoading, error, refetch, isRefetching } = useMessages(wid, sid);
	const { busy, permissions, questions, conn } = usePendingState();
	const scrollRef = useRef<HTMLDivElement>(null);
	const pinned = useRef(true);
	const hadMessages = useRef(false);

	const sessionPermissions = permissions.filter((p) => p.session_id === sid);
	const sessionQuestions = questions.filter((q) => q.session_id === sid);

	// Opening a session lands on the latest message — the scroll must
	// re-run a frame later because web fonts and images settle layout
	// after first paint and would leave the view mid-transcript.
	useEffect(() => {
		pinned.current = true;
		hadMessages.current = false;
		const el = scrollRef.current;
		if (!el) return;
		el.scrollTop = el.scrollHeight;
		const raf = requestAnimationFrame(() => {
			el.scrollTop = el.scrollHeight;
		});
		return () => cancelAnimationFrame(raf);
	}, [sid]);

	// Keep the transcript pinned to the bottom while streaming or when a
	// prompt arrives, unless the user has scrolled up. When the first
	// content lands after a load, scroll once more a frame later for the
	// same late-layout reason as the session-open effect.
	useEffect(() => {
		const el = scrollRef.current;
		const firstContent = !hadMessages.current && (messages?.length ?? 0) > 0;
		hadMessages.current = (messages?.length ?? 0) > 0;
		if (!el || !pinned.current) return;
		el.scrollTop = el.scrollHeight;
		if (firstContent) {
			requestAnimationFrame(() => {
				el.scrollTop = el.scrollHeight;
			});
		}
	}, [messages, sessionPermissions.length, sessionQuestions.length]);

	const onScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
	};

	return (
		<div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
			<div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-4 sm:px-6">
				{isLoading && (
					<div className="flex items-center justify-center gap-3 py-10 text-center font-display text-lg text-on-surface-muted">
						<LoadingSpinner size={16} className="text-primary-400" /> loading transcript…
					</div>
				)}
				{error && (
					<div className="flex flex-col items-center gap-2 py-4 text-center">
						<p className="font-display text-sm text-danger-400">{errorLabel(error)}</p>
						<Button
							size="sm"
							variant="outlined"
							className="font-display"
							isLoading={isRefetching}
							onClick={() => refetch()}
						>
							RETRY
						</Button>
					</div>
				)}
				{!isLoading && (messages ?? []).length === 0 && (
					<EmptyState
						text="No messages yet — send a prompt to start"
						className="py-16 font-display text-lg"
					/>
				)}

				{conn !== "open" && (
					<div className="flex items-center justify-center gap-2 border border-dashed border-warning-500/50 bg-warning-950/20 px-3 py-1.5 font-display text-xs text-warning-400">
						<LoadingSpinner size={12} className="text-warning-400" />
						{conn === "closed" ? "event stream closed — reconnecting…" : "reconnecting to event stream…"}
					</div>
				)}

				{(messages ?? []).map((m) => (
					<MessageView key={m.id} message={m} />
				))}

				{busy[sid] && (
					<div className="flex items-center gap-2 font-display text-sm text-on-surface-muted">
						<LoadingSpinner size={14} className="text-primary-400" />
						agent is working…
					</div>
				)}

				{sessionPermissions.map((request) => (
					<PermissionCard key={request.id} wid={wid} request={request} />
				))}
				{sessionQuestions.map((request) => (
					<QuestionCard key={request.id} wid={wid} request={request} />
				))}
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
		</div>
	);
}
