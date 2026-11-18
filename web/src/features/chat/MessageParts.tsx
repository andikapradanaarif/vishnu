import type {
	ContentPart,
	Message,
	SubAgentReport,
	Todo,
	ToolCall,
	ToolResult,
} from "@vishnu/api-contract";
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

/** Elapsed time between a tool call's start and its result's finish. */
function elapsedMs(call: ToolCall, results?: ReadonlyMap<string, ToolResult>): number | null {
	if (!call.started_at_ms) return null;
	const end = results?.get(call.id)?.finished_at_ms;
	if (!end || end < call.started_at_ms) return null;
	return end - call.started_at_ms;
}

function formatElapsed(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const m = Math.floor(ms / 60_000);
	return `${m}m ${Math.round((ms - m * 60_000) / 1000)}s`;
}

/** Renders one content part of a message in reading order. */
export function MessagePart({
	part,
	role,
	results,
}: {
	part: ContentPart;
	role: Message["role"];
	/** tool_call_id → result, for elapsed time on calls (v0.101+ fields). */
	results?: ReadonlyMap<string, ToolResult>;
}) {
	switch (part.type) {
		case "text": {
			const { text, hidden } = part.data as { text: string; hidden?: boolean };
			if (hidden || !text.trim()) return null;
			return role === "assistant" ? (
				<Markdown>{text}</Markdown>
			) : (
				<p className="text-sm whitespace-pre-wrap break-words text-on-surface">{text}</p>
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
					<p className="mt-2 font-mono whitespace-pre-wrap break-all">{thinking}</p>
				</details>
			);
		}
		case "tool_call": {
			const call = part.data as ToolCall;
			const plan = call.name === "todos" ? parsePlan(call.input) : null;
			const elapsed = elapsedMs(call, results);
			return (
				<div className="border border-border bg-raised px-3 py-2">
					<div className="flex items-center gap-1.5 font-display text-sm text-info-300">
						<span className="font-mono">{call.name}</span>
						{!call.finished && (
							<span className="blink ml-auto font-display text-xs text-warning-400">running</span>
						)}
						{call.finished && elapsed !== null && (
							<span className="ml-auto font-display text-xs text-ghost">
								{formatElapsed(elapsed)}
							</span>
						)}
					</div>
					{plan && (
						<div className="mt-1">
							<TodoList todos={plan} />
						</div>
					)}
					{!plan && call.input && (
						<details className="mt-1">
							<summary className="cursor-pointer font-display text-sm text-ghost select-none">
								input
							</summary>
							<pre className="mt-1 overflow-x-auto font-mono text-[13px] whitespace-pre-wrap break-all text-on-surface-muted">
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
						res.is_error ? "border-danger-500/60 bg-danger-950/30" : "border-border bg-raised"
					}`}
				>
					<summary className="cursor-pointer font-display text-sm text-on-surface-muted select-none">
						{res.name || "tool"} result{res.is_error ? " · error" : ""}
					</summary>
					<pre className="mt-1 max-h-64 overflow-auto font-mono text-[13px] whitespace-pre-wrap break-all text-on-surface-muted">
						{clamp(res.content, 6000)}
					</pre>
				</details>
			);
		}
		case "sub_agent_report": {
			const report = part.data as SubAgentReport;
			return (
				<div
					className={`border px-3 py-2 ${
						report.failed
							? "border-danger-500/60 bg-danger-950/30"
							: "border-violet-500/50 bg-violet-950/20"
					}`}
				>
					<div className="flex items-center gap-1.5 font-display text-sm text-violet-300">
						<span>{report.label || "subagent"}</span>
						{report.model && (
							<span className="truncate font-mono text-xs text-ghost">{report.model}</span>
						)}
						{report.failed && (
							<span className="ml-auto font-display text-xs text-danger-400">failed</span>
						)}
					</div>
					{report.output.trim() && (
						<details className="mt-1" open={report.failed}>
							<summary className="cursor-pointer font-display text-sm text-ghost select-none">
								report
							</summary>
							<div className="mt-1 text-[13px]">
								<Markdown>{report.output}</Markdown>
							</div>
						</details>
					)}
				</div>
			);
		}
		case "shell_command": {
			const sh = part.data as { command: string; output: string };
			return (
				<div className="border border-border bg-surface-alt px-3 py-2 font-mono text-[13px]">
					<div className="text-success-400 break-all">$ {sh.command}</div>
					{sh.output && (
						<pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-on-surface-muted">
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
