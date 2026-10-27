import { Dialog } from "@vishnu/ui-component/dialog";
import { Switch } from "@vishnu/ui-component";
import { usePermissionsSkip, useSetPermissionsSkip } from "../../hooks/queries";
import { AgentModelControls } from "../topbar/AgentModelControls";
import { errorLabel } from "../../utils/errors";

interface SettingsDialogProps {
	wid: string;
	isOpen: boolean;
	onClose: () => void;
}

/** Workspace settings: permission prompt behaviour. */
export function SettingsDialog({ wid, isOpen, onClose }: SettingsDialogProps) {
	const { data: skip } = usePermissionsSkip(wid);
	const setSkip = useSetPermissionsSkip(wid);
	const checked = skip?.skip ?? false;

	return (
		<Dialog
			isOpen={isOpen}
			onClose={onClose}
			title="Settings"
			containerClassName="mx-3 w-full max-w-md"
			className="w-full pixel-border bg-surface"
		>
			<section>
				<h3 className="font-display text-lg text-on-surface">Agent &amp; model</h3>
				<p className="mt-1 text-xs text-on-surface-muted">
					The defaults every session inherits — a room can pin its own
					model from the top bar without changing these.
				</p>
				<div className="mt-3 flex flex-col gap-3">
					<AgentModelControls
						wid={wid}
						showLabels
						agentClassName="w-full font-display"
						modelClassName="w-full font-display"
					/>
				</div>
			</section>

			<section className="mt-5 border-t-2 border-border pt-4">
				<h3 className="font-display text-lg text-on-surface">Permissions</h3>
				<p className="mt-1 text-xs text-on-surface-muted">
					When skip is on, crush auto-allows tool permission requests for this
					workspace instead of showing a decision card. A session can set its
					own override with /skip in the composer.
				</p>
				<div className="mt-3 flex items-center justify-between gap-3">
					<label
						htmlFor="settings-skip-permissions"
						className="cursor-pointer font-display text-base text-on-surface"
					>
						Skip permission prompts
					</label>
					<Switch
						name="settings-skip-permissions"
						checked={checked}
						onChange={(value) => setSkip.mutate(value)}
					/>
				</div>
				<p className="mt-1 font-display text-xs text-on-surface-muted">
					{checked
						? "On — tool permissions are auto-allowed."
						: "Off — each tool permission shows a decision card."}
				</p>
				{setSkip.isError && (
					<p className="mt-1 font-display text-xs text-danger-400">
						{errorLabel(setSkip.error)}
					</p>
				)}
			</section>
		</Dialog>
	);
}
