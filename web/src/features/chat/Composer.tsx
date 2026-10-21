import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { useCancelRun, useSendPrompt } from "@/hooks/queries";
import { errorLabel } from "@/utils/errors";

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
		<div className="safe-bottom border-t-2 border-border bg-surface px-3 pt-3 pb-6 sm:px-6">
			<div className="mx-auto flex w-full min-w-0 items-end gap-2">
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
					className="max-h-[200px] min-h-[40px] min-w-0 flex-1 resize-none border-2 border-border bg-raised px-3 py-2.5 text-sm text-on-surface outline-none placeholder:text-ghost focus:border-primary-500"
				/>
				{busy ? (
					<Button
						size="md"
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
			{sendPrompt.isError && (
				<p className="mt-1 w-full font-display text-xs text-danger-400">
					Failed to send: {errorLabel(sendPrompt.error)}
				</p>
			)}
		</div>
	);
}
