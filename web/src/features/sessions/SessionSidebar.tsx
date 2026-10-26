import { useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { Dialog } from "@vishnu/ui-component/dialog";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { usePendingState } from "@/services/pendingStore";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { useCreateSession, useDeleteSession, useSessions } from "@/hooks/queries";
import { formatCost, sessionTime } from "@/utils/format";
import type { Session } from "@vishnu/api-contract";

interface SessionSidebarProps {
	wid: string;
	activeId: string | undefined;
	onSelect: (id: string) => void;
	/** Replaces the "SESSIONS" title — e.g. the project switcher on md+. */
	header?: ReactNode;
}

export function SessionSidebar({ wid, activeId, onSelect, header }: SessionSidebarProps) {
	const { data: sessions, isLoading, error } = useSessions(wid);
	const createSession = useCreateSession(wid);
	const deleteSession = useDeleteSession(wid);
	const { busy } = usePendingState();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const deleting = sessions?.find((s) => s.id === deletingId);

	const sorted = [...(sessions ?? [])].sort((a, b) => b.updated_at - a.updated_at);

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-14 shrink-0 items-center gap-1 border-b-2 border-border px-3">
				{header ?? (
					<span className="font-display text-sm tracking-[0.25em] text-on-surface-muted">
						SESSIONS
					</span>
				)}
			</div>

			<div className="flex-1 overflow-y-auto px-1.5 py-2">
				<Button
					variant="outlined"
					size="sm"
					className="mb-2 w-full justify-start font-display"
					icon={<Icon icon="ri:add-line" width={16} />}
					isLoading={createSession.isPending}
					onClick={() => createSession.mutate(undefined, { onSuccess: (s) => onSelect(s.id) })}
				>
					NEW SESSION
				</Button>
				{isLoading && (
					<div className="flex items-center justify-center gap-2 py-6 text-center font-display text-sm text-on-surface-muted">
						<LoadingSpinner size={14} className="text-primary-400" /> loading…
					</div>
				)}
				{error && <p className="px-2 py-4 text-xs text-danger-400">{error.message}</p>}
				{!isLoading && sorted.length === 0 && (
					<EmptyState text="No saves yet" className="py-8 font-display text-lg" />
				)}

				{sorted.map((s) => (
					<SessionRow
						key={s.id}
						session={s}
						active={s.id === activeId}
						busy={busy[s.id] ?? s.is_busy}
						onSelect={() => onSelect(s.id)}
						onDelete={() => setDeletingId(s.id)}
					/>
				))}
			</div>

			<Dialog
				isOpen={deletingId !== null}
				onClose={() => setDeletingId(null)}
				title="DELETE SESSION"
			>
				<p className="text-sm text-on-surface-muted">
					Delete “{deleting?.title || "New session"}”? Its messages and plan are
					removed permanently.
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<Button
						variant="outlined"
						size="sm"
						className="font-display"
						onClick={() => setDeletingId(null)}
					>
						CANCEL
					</Button>
					<Button
						color="danger"
						size="sm"
						className="font-display"
						isLoading={deleteSession.isPending}
						onClick={() =>
							deletingId &&
							deleteSession.mutate(deletingId, { onSuccess: () => setDeletingId(null) })
						}
					>
						DELETE
					</Button>
				</div>
			</Dialog>
		</div>
	);
}

interface SessionRowProps {
	session: Session;
	active: boolean;
	busy: boolean;
	onSelect: () => void;
	onDelete: () => void;
}

function SessionRow({ session, active, busy, onSelect, onDelete }: SessionRowProps) {
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
					<div className="flex items-center gap-1.5">
						<span className="min-w-0 flex-1 truncate text-sm text-on-surface">
							{session.title || "New session"}
						</span>
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-on-surface-muted">
						{busy ? (
							<span className="flex items-center gap-1 text-success-400">
								<LoadingSpinner size={10} className="text-success-400" /> working
							</span>
						) : session.attached_clients > 0 ? (
							<span className="text-success-400">
								● {session.attached_clients}{" "}
								{session.attached_clients === 1 ? "client" : "clients"}
							</span>
						) : (
							<span className="text-ghost">idle</span>
						)}
						{session.message_count > 0 && <span>{session.message_count} msgs</span>}
						{session.cost > 0 && <span>{formatCost(session.cost)}</span>}
						<span
							className="ml-auto shrink-0"
							title={new Date(session.updated_at * 1000).toLocaleString()}
						>
							{sessionTime(session.updated_at)}
						</span>
					</div>
				</div>
				<button
					className="shrink-0 p-0.5 text-ghost opacity-100 transition-opacity hover:text-danger-400 md:opacity-0 md:group-hover:opacity-100"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					title="Delete session"
					aria-label="Delete session"
				>
					<Icon icon="ri:delete-bin-line" width={15} />
				</button>
			</div>
		</div>
	);
}
