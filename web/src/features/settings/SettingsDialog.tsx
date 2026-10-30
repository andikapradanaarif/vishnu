import { Dialog } from "@vishnu/ui-component/dialog";
import { Switch } from "@vishnu/ui-component";
import { Button } from "@vishnu/ui-component/button";
import {
	useSessions,
	useSetProjectPermissionsSkip,
	useSetSessionPermissionsSkip,
} from "../../hooks/queries";
import { AgentModelControls } from "../topbar/AgentModelControls";
import { errorLabel } from "../../utils/errors";

interface SettingsDialogProps {
	/** Project id — the workspace default is persisted on the project row. */
	pid: string;
	wid: string;
	/** Active room; when set the dialog also shows that room's override. */
	sid?: string;
	/** The project's persisted workspace default (from the registry). */
	workspaceSkip: boolean;
	isOpen: boolean;
	onClose: () => void;
}

/** Workspace settings: permission prompt behaviour. */
export function SettingsDialog({
	pid,
	wid,
	sid,
	workspaceSkip,
	isOpen,
	onClose,
}: SettingsDialogProps) {
	const setWorkspaceSkip = useSetProjectPermissionsSkip(wid);
	const setSessionSkip = useSetSessionPermissionsSkip(wid, sid);
	const { data: sessions } = useSessions(wid);
	const session = sid ? sessions?.find((s) => s.id === sid) : undefined;
	const override = session?.permission_skip;
	const effective = override ?? workspaceSkip;

	const error = setWorkspaceSkip.error ?? setSessionSkip.error;

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
					The defaults every session inherits — a room can pin its own model from the top bar
					without changing these.
				</p>
				<div className="mt-3 flex flex-col gap-3">
					<AgentModelControls
						pid={pid}
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
					When skip is on, crush auto-allows tool permission requests instead of showing a decision
					card. This default is stored with the project, so it survives closing the tab and the
					agent server restarting.
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
						checked={workspaceSkip}
						onChange={(value) => setWorkspaceSkip.mutate({ id: pid, skip: value })}
					/>
				</div>
				<p className="mt-1 font-display text-xs text-on-surface-muted">
					{workspaceSkip
						? "On — tool permissions are auto-allowed."
						: "Off — each tool permission shows a decision card."}
				</p>

				{sid && (
					<div className="mt-4 border-t-2 border-border pt-3">
						<div className="flex items-center justify-between gap-3">
							<span className="font-display text-base text-on-surface">This room</span>
							<Button
								variant="outlined"
								size="sm"
								disabled={override == null || setSessionSkip.isPending}
								onClick={() => setSessionSkip.mutate(null)}
								className="font-display"
							>
								FOLLOW WORKSPACE
							</Button>
						</div>
						<p className="mt-1 font-display text-xs text-on-surface-muted">
							{override == null
								? `Inherits the workspace default — currently ${effective ? "on" : "off"}.`
								: `Pinned ${override ? "on" : "off"} for this room; the workspace default is ${
										workspaceSkip ? "on" : "off"
									}.`}{" "}
							Toggle it from the composer with /skip.
						</p>
					</div>
				)}

				{error && <p className="mt-1 font-display text-xs text-danger-400">{errorLabel(error)}</p>}
			</section>
		</Dialog>
	);
}
