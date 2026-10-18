import { Icon } from "@iconify/react";
import type { ContentPart, Message, ToolCall, ToolResult } from "@vishnu/api-contract";
import { clamp, prettyJson } from "@/utils/format";
import { Markdown } from "./Markdown";

/** Renders one content part of a message in reading order. */
export function MessagePart({ part, role }: { part: ContentPart; role: Message["role"] }) {
	switch (part.type) {
		case "text": {
			const { text, hidden } = part.data as { text: string; hidden?: boolean };
			if (hidden || !text.trim()) return null;
			return role === "assistant" ? (
				<Markdown>{text}</Markdown>
			) : (
				<p className="text-sm whitespace-pre-wrap">{text}</p>
			);
		}
		case "reasoning": {
			const { thinking } = part.data as { thinking: string };
			if (!thinking?.trim()) return null;
			return (
				<details className="rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-400">
					<summary className="cursor-pointer text-neutral-500 select-none">
						Thinking
					</summary>
					<p className="mt-2 font-mono whitespace-pre-wrap">{thinking}</p>
				</details>
			);
		}
		case "tool_call": {
			const call = part.data as ToolCall;
			return (
				<div className="rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
					<div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
						<Icon icon="ri:tools-line" width={13} />
						<span className="font-mono">{call.name}</span>
						{!call.finished && (
							<span className="ml-auto text-[10px] text-amber-400">running</span>
						)}
					</div>
					{call.input && (
						<details className="mt-1">
							<summary className="cursor-pointer text-[11px] text-neutral-500 select-none">
								input
							</summary>
							<pre className="mt-1 overflow-x-auto font-mono text-[11px] text-neutral-400">
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
					className={`rounded-md border px-3 py-2 ${
						res.is_error
							? "border-red-900/60 bg-red-950/40"
							: "border-neutral-800 bg-neutral-900/60"
					}`}
				>
					<summary className="cursor-pointer text-[11px] text-neutral-500 select-none">
						{res.name || "tool"} result{res.is_error ? " · error" : ""}
					</summary>
					<pre className="mt-1 max-h-64 overflow-auto font-mono text-[11px] whitespace-pre-wrap text-neutral-400">
						{clamp(res.content, 6000)}
					</pre>
				</details>
			);
		}
		case "shell_command": {
			const sh = part.data as { command: string; output: string };
			return (
				<div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs">
					<div className="text-emerald-400">$ {sh.command}</div>
					{sh.output && (
						<pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-neutral-400">
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
