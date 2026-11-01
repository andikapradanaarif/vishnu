import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import type { TextContent } from "@vishnu/api-contract";
import {
	useCancelRun,
	useClearPrompts,
	useCreateSession,
	useInitProject,
	useMessages,
	useNeedsInit,
	usePermissionsSkip,
	useRunShell,
	useSendPrompt,
	useSessions,
	useSetSessionPermissionsSkip,
	useSummarize,
} from "@/hooks/queries";
import { errorLabel } from "@/utils/errors";
import { clamp } from "@/utils/format";

interface ComposerProps {
	wid: string;
	sid: string;
	busy: boolean;
}

interface SlashCommand {
	name: string;
	hint?: string;
	desc: string;
	/** true = selecting fills `/name ` and waits for an argument. */
	takesArg?: boolean;
	run: (arg: string) => void;
}

export function Composer({ wid, sid, busy }: ComposerProps) {
	const [value, setValue] = useState("");
	const [menuIdx, setMenuIdx] = useState(0);
	const [menuDismissed, setMenuDismissed] = useState(false);
	const [cmdMsg, setCmdMsg] = useState<{ ok: boolean; text: string } | null>(null);
	const [shellOut, setShellOut] = useState<{ cmd: string; output: string; code: number } | null>(
		null,
	);
	const sendPrompt = useSendPrompt(wid);
	const cancelRun = useCancelRun(wid);
	const needsInit = useNeedsInit(wid);
	const initProject = useInitProject(wid);
	const summarize = useSummarize(wid);
	const runShell = useRunShell(wid);
	const clearPrompts = useClearPrompts(wid);
	const skip = usePermissionsSkip(wid);
	const setSessionSkip = useSetSessionPermissionsSkip(wid, sid);
	const { data: sessions } = useSessions(wid);
	const session = sessions?.find((s) => s.id === sid);
	// Tri-state: session.permission_skip wins over the workspace flag;
	// absent means this room inherits the default.
	const skipOverride = session?.permission_skip;
	const skipEffective = skipOverride ?? skip.data?.skip ?? false;
	const createSession = useCreateSession(wid);
	const navigate = useNavigate();
	const { projectId } = useParams({ strict: false }) as { projectId?: string };
	const areaRef = useRef<HTMLTextAreaElement>(null);

	// Drafts persist per session so switching rooms and back doesn't lose
	// an in-progress message; every write path funnels through setDraft
	// so storage always tracks what's in the box.
	const draftKey = `vishnu:draft:${wid}:${sid}`;
	const setDraft = (v: string) => {
		setValue(v);
		if (v) localStorage.setItem(draftKey, v);
		else localStorage.removeItem(draftKey);
	};

	// Sent-prompt history for ArrowUp recall — steps back from the newest
	// user text part; `null` while the box holds a fresh (non-browsed)
	// draft. browsedDraft stashes the draft in progress when browsing
	// begins so ArrowDown past the newest entry restores it.
	const { data: messages } = useMessages(wid, sid);
	const history = useMemo(() => {
		const out: string[] = [];
		for (const m of messages ?? []) {
			if (m.role !== "user") continue;
			for (const p of m.parts) {
				if (p.type !== "text") continue;
				const d = p.data as TextContent;
				if (d.hidden) continue;
				const text = d.text?.trim();
				if (text) out.push(text);
			}
		}
		return out;
	}, [messages]);
	const [historyIdx, setHistoryIdx] = useState<number | null>(null);
	const browsedDraft = useRef("");

	const autogrow = () => {
		const el = areaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	};

	// The composer isn't remounted on session switches — swap in the new
	// room's stored draft and drop the rest of the per-session scratch
	// state (notices, shell output, browsing) so nothing leaks across.
	useEffect(() => {
		setValue(localStorage.getItem(draftKey) ?? "");
		setCmdMsg(null);
		setShellOut(null);
		setMenuDismissed(false);
		setHistoryIdx(null);
		requestAnimationFrame(autogrow);
	}, [draftKey]);

	const recall = (dir: 1 | -1) => {
		if (dir === 1) {
			const next = historyIdx === null ? 0 : historyIdx + 1;
			if (next >= history.length) return;
			if (historyIdx === null) browsedDraft.current = value;
			setHistoryIdx(next);
			setDraft(history[history.length - 1 - next]);
		} else {
			if (historyIdx === null) return;
			const next = historyIdx - 1;
			setHistoryIdx(next < 0 ? null : next);
			setDraft(next < 0 ? browsedDraft.current : history[history.length - 1 - next]);
		}
		requestAnimationFrame(() => {
			const el = areaRef.current;
			el?.setSelectionRange(el.value.length, el.value.length);
			autogrow();
		});
	};

	const cmdNotice = (ok: boolean, text: string) => setCmdMsg({ ok, text });

	const commands: SlashCommand[] = [
		{
			name: "init",
			desc: needsInit.data?.needs_init
				? "scan the project and write agent guidance"
				: "re-run the project scan — a context file already exists",
			run: () =>
				initProject.mutate(sid, {
					onSuccess: () => cmdNotice(true, "init run started"),
					onError: (e) => cmdNotice(false, `init failed: ${errorLabel(e)}`),
				}),
		},
		{
			name: "summarize",
			desc: "compact this session's history",
			run: () =>
				summarize.mutate(sid, {
					onSuccess: () => cmdNotice(true, "summarize requested"),
					onError: (e) => cmdNotice(false, `summarize failed: ${errorLabel(e)}`),
				}),
		},
		{
			name: "new",
			desc: "start a new session",
			run: () =>
				createSession.mutate(undefined, {
					onSuccess: (s) =>
						navigate({
							to: "/projects/$projectId/sessions/$sessionId",
							params: { projectId: projectId!, sessionId: s.id },
						}),
					onError: (e) => cmdNotice(false, `new session failed: ${errorLabel(e)}`),
				}),
		},
		{
			name: "shell",
			hint: "<cmd>",
			desc: "run a shell command in the project",
			takesArg: true,
			run: (arg) => {
				if (!arg) {
					cmdNotice(false, "usage: /shell <command>");
					return;
				}
				setShellOut(null);
				runShell.mutate(
					{ sid, command: arg },
					{
						onSuccess: (r) => setShellOut({ cmd: arg, output: r.output, code: r.exit_code }),
						onError: (e) => cmdNotice(false, `shell failed: ${errorLabel(e)}`),
					},
				);
			},
		},
		{
			name: "clear",
			desc: "drop queued prompts for this session",
			run: () =>
				clearPrompts.mutate(sid, {
					onSuccess: () => cmdNotice(true, "queued prompts cleared"),
					onError: (e) => cmdNotice(false, `clear failed: ${errorLabel(e)}`),
				}),
		},
		{
			name: "skip",
			hint: "[inherit]",
			desc: `auto-approve ${skipEffective ? "on" : "off"} (${
				skipOverride != null ? "this session" : "workspace default"
			}) — toggle for this room`,
			run: (arg) => {
				if (arg === "inherit") {
					setSessionSkip.mutate(null, {
						onSuccess: () => cmdNotice(true, "auto-approve follows the workspace default"),
						onError: (e) => cmdNotice(false, `reset failed: ${errorLabel(e)}`),
					});
					return;
				}
				setSessionSkip.mutate(!skipEffective, {
					onSuccess: () =>
						cmdNotice(true, `auto-approve ${!skipEffective ? "on" : "off"} for this session`),
					onError: (e) => cmdNotice(false, `toggle failed: ${errorLabel(e)}`),
				});
			},
		},
	];

	// The palette lives only while the input is a single `/token` — once a
	// space lands the first word is a committed command name, and Enter
	// dispatches it instead of picking from the menu.
	const slashToken = /^\/[\w-]*$/.test(value);
	const filtered = slashToken
		? commands.filter((c) => c.name.startsWith(value.slice(1).toLowerCase()))
		: [];
	const menuOpen = filtered.length > 0 && !menuDismissed;
	const activeIdx = filtered.length
		? ((menuIdx % filtered.length) + filtered.length) % filtered.length
		: 0;

	const pick = (cmd: SlashCommand) => {
		if (cmd.takesArg) {
			setDraft(`/${cmd.name} `);
			requestAnimationFrame(() => {
				autogrow();
				areaRef.current?.focus();
			});
			return;
		}
		setDraft("");
		setShellOut(null);
		requestAnimationFrame(autogrow);
		cmd.run("");
	};

	const runSlash = (prompt: string): boolean => {
		const m = prompt.match(/^\/(\S+)\s*(.*)$/s);
		const cmd = m && commands.find((c) => c.name === m[1].toLowerCase());
		if (!cmd) return false;
		setDraft("");
		setShellOut(null);
		requestAnimationFrame(autogrow);
		cmd.run(m![2]?.trim() ?? "");
		return true;
	};

	const send = () => {
		const prompt = value.trim();
		if (!prompt || sendPrompt.isPending) return;
		setCmdMsg(null);
		setHistoryIdx(null);
		if (runSlash(prompt)) return;
		setDraft("");
		setShellOut(null);
		requestAnimationFrame(autogrow);
		sendPrompt.mutate(
			{
				session_id: sid,
				prompt,
				run_id: crypto.randomUUID(),
			},
			{ onError: () => setDraft(prompt) },
		);
	};

	return (
		<div className="safe-bottom border-t-2 border-border bg-surface px-3 pt-3 pb-6 sm:px-6">
			<div className="relative mx-auto w-full min-w-0">
				{menuOpen && (
					<div className="absolute bottom-full left-0 mb-2 w-full max-w-md border-2 border-border bg-raised shadow-[6px_6px_0_rgba(0,0,0,0.35)]">
						{filtered.map((cmd, i) => (
							<button
								key={cmd.name}
								type="button"
								onMouseEnter={() => setMenuIdx(i)}
								onClick={() => pick(cmd)}
								className={`flex w-full items-baseline gap-3 px-3 py-2 text-left ${
									i === activeIdx ? "bg-primary-500/20 text-on-surface" : "text-on-surface-muted"
								}`}
							>
								<span className="shrink-0 font-display text-sm text-primary-400">
									/{cmd.name}
									{cmd.hint && <span className="text-ghost"> {cmd.hint}</span>}
								</span>
								<span className="min-w-0 flex-1 truncate text-xs">{cmd.desc}</span>
							</button>
						))}
						<div className="border-t border-border px-3 py-1.5 font-display text-[10px] tracking-[0.15em] text-ghost">
							↑↓ select · enter run · esc close
						</div>
					</div>
				)}

				{shellOut && (
					<div className="absolute bottom-full left-0 mb-2 w-full max-w-2xl border-2 border-border bg-surface-alt px-3 py-2 font-mono text-xs">
						<div className="flex items-start justify-between gap-2">
							<span className="text-success-400">$ {shellOut.cmd}</span>
							<span className="flex items-center gap-2">
								<span className={shellOut.code === 0 ? "text-ghost" : "text-danger-400"}>
									exit {shellOut.code}
								</span>
								<button
									type="button"
									onClick={() => setShellOut(null)}
									className="text-ghost hover:text-on-surface"
									aria-label="Dismiss shell output"
								>
									<Icon icon="ri:close-line" width={14} />
								</button>
							</span>
						</div>
						{shellOut.output && (
							<pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-on-surface-muted">
								{clamp(shellOut.output, 4000)}
							</pre>
						)}
					</div>
				)}

				<div className="flex items-end gap-2">
					<textarea
						ref={areaRef}
						rows={1}
						value={value}
						placeholder={busy ? "agent is working…" : "message the agent…"}
						onChange={(e) => {
							setDraft(e.target.value);
							setMenuIdx(0);
							setMenuDismissed(false);
							setHistoryIdx(null);
							autogrow();
						}}
						onKeyDown={(e) => {
							if (menuOpen) {
								if (e.key === "ArrowDown") {
									e.preventDefault();
									setMenuIdx((i) => i + 1);
									return;
								}
								if (e.key === "ArrowUp") {
									e.preventDefault();
									setMenuIdx((i) => i - 1);
									return;
								}
								if (e.key === "Escape") {
									e.preventDefault();
									setMenuDismissed(true);
									return;
								}
								if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
									e.preventDefault();
									pick(filtered[activeIdx]);
									return;
								}
							}
							// Readline-style recall: ArrowUp on the first line steps
							// back through sent prompts, ArrowDown walks toward the
							// draft that was in progress. Once browsing, arrows cycle
							// unconditionally — caret is pinned to the end anyway.
							if (e.key === "ArrowUp") {
								const el = e.currentTarget;
								const onFirstLine =
									el.selectionStart === el.selectionEnd &&
									!el.value.slice(0, el.selectionStart).includes("\n");
								if (historyIdx !== null || (onFirstLine && history.length > 0)) {
									e.preventDefault();
									recall(1);
								}
								return;
							}
							if (e.key === "ArrowDown" && historyIdx !== null) {
								e.preventDefault();
								recall(-1);
								return;
							}
							if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
								e.preventDefault();
								send();
							}
						}}
						className="max-h-[200px] min-h-[36px] min-w-0 flex-1 resize-none border-2 border-border bg-raised px-3 py-1.5 text-sm text-on-surface outline-none placeholder:text-ghost focus:border-primary-500"
					/>
					{busy ? (
						<Button
							size="sm"
							variant="outlined"
							color="danger"
							className="font-display"
							icon={<Icon icon="ri:stop-fill" width={14} />}
							onClick={() => cancelRun.mutate(sid)}
							isLoading={cancelRun.isPending}
						>
							STOP
						</Button>
					) : (
						<Button
							size="md"
							className="px-3"
							onClick={send}
							disabled={!value.trim()}
							isLoading={sendPrompt.isPending}
							aria-label="Send message"
						>
							<Icon icon="ri:send-plane-2-fill" width={18} />
						</Button>
					)}
				</div>
			</div>
			{sendPrompt.isError && (
				<p className="mt-1 w-full font-display text-xs text-danger-400">
					Failed to send: {errorLabel(sendPrompt.error)}
				</p>
			)}
			{cmdMsg && (
				<p
					className={`mt-1 w-full font-display text-xs ${
						cmdMsg.ok ? "text-success-400" : "text-danger-400"
					}`}
				>
					{cmdMsg.text}
				</p>
			)}
		</div>
	);
}
