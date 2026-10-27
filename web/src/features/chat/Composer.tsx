import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import {
	useCancelRun,
	useClearPrompts,
	useCreateSession,
	useInitProject,
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

	// The composer isn't remounted on session switches — drop per-session
	// scratch state (draft, notices, shell output) so nothing from the
	// previous session leaks into the next.
	useEffect(() => {
		setValue("");
		setCmdMsg(null);
		setShellOut(null);
		setMenuDismissed(false);
	}, [sid]);

	const autogrow = () => {
		const el = areaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
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
						onSuccess: (r) =>
							setShellOut({ cmd: arg, output: r.output, code: r.exit_code }),
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
						onSuccess: () =>
							cmdNotice(true, "auto-approve follows the workspace default"),
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
			setValue(`/${cmd.name} `);
			requestAnimationFrame(() => {
				autogrow();
				areaRef.current?.focus();
			});
			return;
		}
		setValue("");
		setShellOut(null);
		requestAnimationFrame(autogrow);
		cmd.run("");
	};

	const runSlash = (prompt: string): boolean => {
		const m = prompt.match(/^\/(\S+)\s*(.*)$/s);
		const cmd = m && commands.find((c) => c.name === m[1].toLowerCase());
		if (!cmd) return false;
		setValue("");
		setShellOut(null);
		requestAnimationFrame(autogrow);
		cmd.run(m![2]?.trim() ?? "");
		return true;
	};

	const send = () => {
		const prompt = value.trim();
		if (!prompt || sendPrompt.isPending) return;
		setCmdMsg(null);
		if (runSlash(prompt)) return;
		setValue("");
		setShellOut(null);
		requestAnimationFrame(autogrow);
		sendPrompt.mutate({
			session_id: sid,
			prompt,
			run_id: crypto.randomUUID(),
		});
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
									i === activeIdx
										? "bg-primary-500/20 text-on-surface"
										: "text-on-surface-muted"
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
								<span
									className={
										shellOut.code === 0 ? "text-ghost" : "text-danger-400"
									}
								>
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
							setValue(e.target.value);
							setMenuIdx(0);
							setMenuDismissed(false);
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
