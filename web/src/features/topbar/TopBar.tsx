import { Icon } from "@iconify/react";
import type { Project } from "@vishnu/api-contract";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { AgentModelControls } from "./AgentModelControls";

interface TopBarProps {
	project: Project;
	workspaceId: string;
	/** Active room — scopes the model picker to the session override. */
	sessionId?: string;
	menuOpen?: boolean;
	onMenu: () => void;
	onSwitchProject: () => void;
	onSelectProject: (id: string) => void;
	onSettings: () => void;
}

export function TopBar({
	project,
	workspaceId,
	sessionId,
	menuOpen = false,
	onMenu,
	onSwitchProject,
	onSelectProject,
	onSettings,
}: TopBarProps) {
	return (
		<header className="flex h-14 min-w-0 items-center gap-2 overflow-hidden border-b-2 border-border bg-surface px-3">
			<button
				type="button"
				className="p-2 text-on-surface-muted hover:bg-raised hover:text-primary-400 md:hidden"
				onClick={onMenu}
				aria-label={menuOpen ? "Close menu" : "Open menu"}
				title={menuOpen ? "Close menu" : "Sessions, switch project, log out"}
			>
				<Icon icon={menuOpen ? "ri:close-line" : "ri:menu-line"} width={20} />
			</button>

			{/* Back + project dropdown: lives in the sidebar title on md+. */}
			<div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
				<ProjectSwitcher
					project={project}
					onBack={onSwitchProject}
					onSelectProject={onSelectProject}
				/>
			</div>

			<AgentModelControls
				pid={project.id}
				wid={workspaceId}
				sid={sessionId}
				agentClassName="hidden w-28 shrink-0 font-display sm:block sm:w-36 md:ml-auto"
				modelClassName="hidden !w-auto min-w-0 font-display lg:block"
			/>

			<button
				type="button"
				onClick={onSettings}
				aria-label="Settings"
				title="Settings"
				className="shrink-0 p-2 text-on-surface-muted hover:bg-raised hover:text-primary-400"
			>
				<Icon icon="ri:settings-3-line" width={20} />
			</button>

		</header>
	);
}
