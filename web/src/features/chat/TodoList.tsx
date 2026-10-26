import { Icon } from "@iconify/react";
import type { Todo } from "@vishnu/api-contract";

interface TodoListProps {
	todos: Todo[];
	/** Stale greys out in-progress rows — the run ended mid-plan, so
	 *  in_progress is a frozen snapshot, not a live status. */
	stale?: boolean;
}

const ICONS: Record<string, string> = {
	completed: "ri:checkbox-circle-fill",
	in_progress: "ri:play-circle-fill",
};

function icon(status: string) {
	return ICONS[status] ?? "ri:checkbox-blank-circle-line";
}

function itemClass(status: string, stale?: boolean) {
	if (status === "completed") return "text-success-400/70";
	if (status === "in_progress") return stale ? "text-warning-400/60" : "text-primary-300";
	return "text-ghost";
}

/** A session's plan ledger — the last write from the agent's todos tool. */
export function TodoList({ todos, stale }: TodoListProps) {
	return (
		<ul className="flex flex-col gap-1">
			{todos.map((t, i) => (
				<li key={i} className={`flex items-start gap-2 text-xs ${itemClass(t.status, stale)}`}>
					<Icon icon={icon(t.status)} width={14} className="mt-0.5 shrink-0" />
					<span className="min-w-0">
						{t.status === "in_progress" && t.active_form ? t.active_form : t.content}
						{stale && t.status === "in_progress" && (
							<span className="ml-1.5 text-ghost">(run ended)</span>
						)}
					</span>
				</li>
			))}
		</ul>
	);
}
