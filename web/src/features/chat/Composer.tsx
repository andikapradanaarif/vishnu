import { useRef, useState } from "react";
import { Button } from "@vishnu/ui-component/button";
import { useCancelRun, useSendPrompt } from "@/hooks/queries";

interface ComposerProps {
	wid: string;
	sid: string;
	busy: boolean;
}

export function Composer({ wid, sid, busy }: ComposerProps) {
	const [value, setValue] = useState("");
	const sendPrompt = useSendPrompt(wid);
	const cancelRun = useCancelRun(wid);
	const areaRef = useRef<HTMLTextAreaElement>(null);

	const autogrow = () => {
		const el = areaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	};

	const send = () => {
		const prompt = value.trim();
		if (!prompt || sendPrompt.isPending) return;
		setValue("");
		requestAnimationFrame(autogrow);
		sendPrompt.mutate({
			session_id: sid,
			prompt,
			run_id: crypto.randomUUID(),
		});
	};

	return (
		<div className="safe-bottom border-t-2 border-border bg-surface px-3 pt-2 pb-3 sm:px-6">
			<div className="mx-auto flex max-w-3xl items-end gap-2">
				<span className="mb-2.5 shrink-0 font-display text-xl text-primary-400">&gt;</span>
				<textarea
					ref={areaRef}
					rows={1}
					value={value}
					placeholder={busy ? "agent is working…" : "message the agent…"}
					onChange={(e) => {
						setValue(e.target.value);
						autogrow();
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
							e.preventDefault();
							send();
						}
					}}
					className="max-h-[200px] min-h-[40px] flex-1 resize-none border-2 border-border bg-raised px-3 py-2.5 text-base text-on-surface outline-none placeholder:text-ghost focus:border-primary-500 sm:text-sm"
				/>
				{busy ? (
					<Button
						size="md"
						variant="outlined"
						color="danger"
						className="font-display"
						onClick={() => cancelRun.mutate(sid)}
						isLoading={cancelRun.isPending}
					>
						■ STOP
					</Button>
				) : (
					<Button
						size="md"
						className="font-display"
						onClick={send}
						disabled={!value.trim()}
						isLoading={sendPrompt.isPending}
					>
						SEND
					</Button>
				)}
			</div>
			{sendPrompt.isError && (
				<p className="mx-auto mt-1 max-w-3xl font-display text-xs text-danger-400">
					Failed to send: {sendPrompt.error?.message}
				</p>
			)}
		</div>
	);
}
