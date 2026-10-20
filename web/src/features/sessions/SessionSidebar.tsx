import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { usePendingState } from "@/services/pendingStore";
import { useCreateSession, useDeleteSession, useSessions } from "@/hooks/queries";
import { formatCost, relativeTime } from "@/utils/format";
import type { Session } from "@vishnu/api-contract";

interface SessionSidebarProps {
	wid: string;
	activeId: string | undefined;
	onSelect: (id: string) => void;
}

export function SessionSidebar({ wid, activeId, onSelect }: SessionSidebarProps) {
	const { data: sessions, isLoading, error } = useSessions(wid);
	const createSession = useCreateSession(wid);
	const deleteSession = useDeleteSession(wid);
	const { busy } = usePendingState();
	const [confirmingId, setConfirmingId] = useState<string | null>(null);

	const sorted = [...(sessions ?? [])].sort((a, b) => b.updated_at - a.updated_at);

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b-2 border-border px-3 py-2.5">
				<span className="font-display text-sm tracking-[0.25em] text-on-surface-muted">
					SESSIONS
				</span>
				<Button
					size="sm"
					variant="text"
					className="text-primary-400"
					icon={<Icon icon="ri:add-line" width={18} />}
					isLoading={createSession.isPending}
					onClick={() => createSession.mutate(undefined, { onSuccess: (s) => onSelect(s.id) })}
					aria-label="New session"
				/>
			</div>

			<div className="flex-1 overflow-y-auto px-1.5 py-2">
				{isLoading && (
					<div className="py-6 text-center font-display text-sm text-on-surface-muted">
						<span className="blink text-primary-400">▊</span> loading…
					</div>
				)}
				{error && <p className="px-2 py-4 text-xs text-danger-400">{error.message}</p>}
				{!isLoading && sorted.length === 0 && (
					<EmptyState text="No saves yet" className="py-8 font-display text-lg" />
				)}

				{sorted.map((s, index) => (
					<SessionRow
						key={s.id}
						session={s}
						slot={index + 1}
						active={s.id === activeId}
						busy={busy[s.id] ?? s.is_busy}
						confirming={confirmingId === s.id}
						onSelect={() => onSelect(s.id)}
						onDelete={() => {
							if (confirmingId === s.id) {
								deleteSession.mutate(s.id);
								setConfirmingId(null);
							} else {
								setConfirmingId(s.id);
								setTimeout(() => setConfirmingId((c) => (c === s.id ? null : c)), 2500);
							}
						}}
					/>
				))}
			</div>
		</div>
	);
}

interface SessionRowProps {
	session: Session;
	slot: number;
	active: boolean;
	busy: boolean;
	confirming: boolean;
	onSelect: () => void;
	onDelete: () => void;
}

function SessionRow({
	session,
	slot,
	active,
	busy,
	confirming,
	onSelect,
	onDelete,
}: SessionRowProps) {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
			className={`group mb-0.5 cursor-pointer border-l-2 px-2.5 py-2 ${
				active
					? "border-primary-500 bg-raised"
					: "border-transparent hover:bg-raised"
			}`}
		>
			<div className="flex items-start gap-2">
				<span className="mt-0.5 shrink-0 font-display text-lg text-primary-400">
					{active ? "▸" : " "}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-2">
						<span className="font-display text-xs tracking-[0.15em] text-ghost">
							SLOT {String(slot).padStart(2, "0")}
						</span>
						<span className="shrink-0 font-display text-[11px] text-on-surface-muted">
							{relativeTime(session.updated_at)}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						{busy && <span className="blink text-primary-400">▊</span>}
						<span className="min-w-0 flex-1 truncate text-sm text-on-surface">
							{session.title || "New session"}
						</span>
					</div>
					<div className="mt-0.5 flex items-center gap-2 font-display text-[11px] text-on-surface-muted">
						{session.message_count > 0 && <span>{session.message_count} msgs</span>}
						{session.cost > 0 && <span>{formatCost(session.cost)}</span>}
					</div>
				</div>
				<button
					className={`shrink-0 p-0.5 transition-opacity hover:text-danger-400 ${
						confirming
							? "text-danger-400 opacity-100"
							: "text-ghost opacity-100 md:opacity-0 md:group-hover:opacity-100"
					}`}
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					title={confirming ? "Click again to confirm delete" : "Delete session"}
					aria-label="Delete session"
				>
					<Icon icon={confirming ? "ri:check-line" : "ri:delete-bin-line"} width={15} />
				</button>
			</div>
		</div>
	);
}
