import { Dialog } from "@vishnu/ui-component/dialog";
import { Switch } from "@vishnu/ui-component";
import { Button } from "@vishnu/ui-component/button";
import {
	useConfig,
	useCrushVersion,
	useSessions,
	useSetProjectPermissionsSkip,
	useSetSessionPermissionsSkip,
	useSetSkillConfigDisabled,
	useSetSkillDisabled,
	useSkillRepoToggles,
	useSkills,
} from "../../hooks/queries";
import { AgentModelControls } from "../topbar/AgentModelControls";
import { errorLabel } from "../../utils/errors";
import { clamp } from "../../utils/format";
import type { SkillInfo } from "@vishnu/api-contract";

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
	const { data: version } = useCrushVersion(pid);
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
						effortClassName="w-full font-display"
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

			<SkillsSection wid={wid} />

			{version && (
				<p
					className="mt-5 border-t-2 border-border pt-3 font-display text-xs text-on-surface-muted"
					title={`commit ${version.commit} · ${version.platform} · ${version.go_version}`}
				>
					crush {version.version}
				</p>
			)}
		</Dialog>
	);
}

/**
 * Workspace skills: the switch is the repo-scoped override — a repo
 * "enabled" override wins over a global (`options.disabled_skills`)
 * disable, a repo disable hides an otherwise-visible skill. The text
 * button flips the global flag for every repo.
 */
function SkillsSection({ wid }: { wid: string }) {
	const skills = useSkills(wid);
	const { disabled, enabled } = useSkillRepoToggles(wid);
	const config = useConfig(wid);
	const setDisabled = useSetSkillDisabled(wid);
	const setConfigDisabled = useSetSkillConfigDisabled(wid);

	const configDisabled = new Set(config.data?.options?.disabled_skills ?? []);
	const repoDisabled = new Set(disabled.data ?? []);
	const repoEnabled = new Set(enabled.data ?? []);

	// The visible list only covers active skills — union it with every
	// override list so a disabled skill still has a row to re-enable from.
	const byName = new Map<string, { info?: SkillInfo }>();
	for (const s of skills.data ?? []) byName.set(s.name, { info: s });
	for (const name of [...repoDisabled, ...repoEnabled, ...configDisabled]) {
		if (!byName.has(name)) byName.set(name, {});
	}
	if (byName.size === 0) return null;

	const pending = setDisabled.isPending || setConfigDisabled.isPending;
	const error = setDisabled.error ?? setConfigDisabled.error;

	return (
		<section className="mt-5 border-t-2 border-border pt-4">
			<h3 className="font-display text-lg text-on-surface">Skills</h3>
			<p className="mt-1 text-xs text-on-surface-muted">
				Skills the agent can see in this repository. The switch is the repo override — it can
				re-enable a globally disabled skill for this project alone.
			</p>
			<div className="mt-3 flex flex-col gap-2.5">
				{[...byName.entries()].map(([name, { info }]) => {
					const globallyOff = configDisabled.has(name);
					const repoOn = !repoDisabled.has(name) && (!globallyOff || repoEnabled.has(name));
					return (
						<div key={name} className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div className="font-display text-sm text-on-surface">{info?.label || name}</div>
								{info?.description && (
									<div className="text-[11px] text-on-surface-muted">
										{clamp(info.description, 96)}
									</div>
								)}
								<div className="mt-0.5 flex items-center gap-2 text-[11px] text-ghost">
									{info?.source && <span>{info.source}</span>}
									{globallyOff && <span className="text-warning-400">off globally</span>}
									{!globallyOff && repoEnabled.has(name) && (
										<span className="text-info-300">repo: on</span>
									)}
									<button
										type="button"
										disabled={pending}
										onClick={() => setConfigDisabled.mutate({ name, disabled: !globallyOff })}
										className="cursor-pointer underline decoration-dotted underline-offset-2 hover:text-on-surface"
									>
										{globallyOff ? "enable everywhere" : "disable everywhere"}
									</button>
								</div>
							</div>
							<Switch
								name={`skill-${name}`}
								checked={repoOn}
								onChange={(value) => setDisabled.mutate({ name, disabled: !value })}
							/>
						</div>
					);
				})}
			</div>
			{error && <p className="mt-1 font-display text-xs text-danger-400">{errorLabel(error)}</p>}
		</section>
	);
}
