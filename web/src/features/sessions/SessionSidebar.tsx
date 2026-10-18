import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
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
			<div className="flex items-center justify-between px-3 py-2.5">
				<span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
					Sessions
				</span>
				<Button
					size="sm"
					variant="text"
					icon={<Icon icon="ri:add-line" width={18} />}
					isLoading={createSession.isPending}
					onClick={() => createSession.mutate(undefined, { onSuccess: (s) => onSelect(s.id) })}
					aria-label="New session"
				/>
			</div>

			<div className="flex-1 overflow-y-auto px-1.5 pb-2">
				{isLoading && (
					<div className="flex justify-center py-6">
						<LoadingSpinner size={20} />
					</div>
				)}
				{error && <p className="px-2 py-4 text-xs text-red-400">{error.message}</p>}
				{!isLoading && sorted.length === 0 && (
					<EmptyState text="No sessions yet" className="py-8" />
				)}

				{sorted.map((s) => (
					<SessionRow
						key={s.id}
						session={s}
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
	active: boolean;
	busy: boolean;
	confirming: boolean;
	onSelect: () => void;
	onDelete: () => void;
}

function SessionRow({ session, active, busy, confirming, onSelect, onDelete }: SessionRowProps) {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
			className={`group mb-0.5 cursor-pointer rounded-lg px-2.5 py-2 transition-colors ${
				active ? "bg-neutral-800" : "hover:bg-neutral-900"
			}`}
		>
			<div className="flex items-center gap-2">
				{busy && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />}
				<span className="min-w-0 flex-1 truncate text-sm text-neutral-200">
					{session.title || "New session"}
				</span>
				<button
					className={`shrink-0 rounded p-0.5 text-neutral-500 transition-opacity hover:text-red-400 ${
						confirming ? "text-red-400 opacity-100" : "opacity-0 group-hover:opacity-100"
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
			<div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
				<span>{relativeTime(session.updated_at)}</span>
				{session.message_count > 0 && <span>· {session.message_count} msgs</span>}
				{session.cost > 0 && <span>· {formatCost(session.cost)}</span>}
			</div>
		</div>
	);
}
