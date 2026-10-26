import type { ContentPart, Message, Todo, ToolCall, ToolResult } from "@vishnu/api-contract";
import { clamp, prettyJson } from "@/utils/format";
import { Markdown } from "./Markdown";
import { TodoList } from "./TodoList";

/** The todos tool's input is a JSON string of `{todos: [...]}` — parse
 *  it so the call renders as a checklist instead of a raw blob. */
function parsePlan(input: string): Todo[] | null {
	try {
		const parsed = JSON.parse(input) as { todos?: Todo[] };
		return Array.isArray(parsed?.todos) ? parsed.todos : null;
	} catch {
		return null;
	}
}

/** Renders one content part of a message in reading order. */
export function MessagePart({ part, role }: { part: ContentPart; role: Message["role"] }) {
	switch (part.type) {
		case "text": {
			const { text, hidden } = part.data as { text: string; hidden?: boolean };
			if (hidden || !text.trim()) return null;
			return role === "assistant" ? (
				<Markdown>{text}</Markdown>
			) : (
				<p className="text-sm whitespace-pre-wrap text-on-surface">{text}</p>
			);
		}
		case "reasoning": {
			const { thinking } = part.data as { thinking: string };
			if (!thinking?.trim()) return null;
			return (
				<details className="border border-border bg-raised px-3 py-2 text-xs text-on-surface-muted">
					<summary className="cursor-pointer font-display text-sm tracking-[0.15em] text-primary-400/80 select-none">
						THINKING
					</summary>
					<p className="mt-2 font-mono whitespace-pre-wrap">{thinking}</p>
				</details>
			);
		}
		case "tool_call": {
			const call = part.data as ToolCall;
			const plan = call.name === "todos" ? parsePlan(call.input) : null;
			return (
				<div className="border border-border bg-raised px-3 py-2">
					<div className="flex items-center gap-1.5 font-display text-base text-info-300">
						<span className="font-mono">{call.name}</span>
						{!call.finished && (
							<span className="blink ml-auto font-display text-xs text-warning-400">
								running
							</span>
						)}
					</div>
					{plan && <div className="mt-1"><TodoList todos={plan} /></div>}
					{!plan && call.input && (
						<details className="mt-1">
							<summary className="cursor-pointer font-display text-xs text-ghost select-none">
								input
							</summary>
							<pre className="mt-1 overflow-x-auto font-mono text-[11px] text-on-surface-muted">
								{clamp(prettyJson(call.input), 4000)}
							</pre>
						</details>
					)}
				</div>
			);
		}
		case "tool_result": {
			const res = part.data as ToolResult;
			if (!res.content?.trim()) return null;
			return (
				<details
					className={`border px-3 py-2 ${
						res.is_error
							? "border-danger-500/60 bg-danger-950/30"
							: "border-border bg-raised"
					}`}
				>
					<summary className="cursor-pointer font-display text-xs text-on-surface-muted select-none">
						{res.name || "tool"} result{res.is_error ? " · error" : ""}
					</summary>
					<pre className="mt-1 max-h-64 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-on-surface-muted">
						{clamp(res.content, 6000)}
					</pre>
				</details>
			);
		}
		case "shell_command": {
			const sh = part.data as { command: string; output: string };
			return (
				<div className="border border-border bg-surface-alt px-3 py-2 font-mono text-xs">
					<div className="text-success-400">$ {sh.command}</div>
					{sh.output && (
						<pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-on-surface-muted">
							{clamp(sh.output, 4000)}
						</pre>
					)}
				</div>
			);
		}
		default:
			return null;
	}
}
