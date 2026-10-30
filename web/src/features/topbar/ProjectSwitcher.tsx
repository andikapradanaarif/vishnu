import { useState } from "react";
import { Icon } from "@iconify/react";
import { Popover } from "@vishnu/ui-component/popover";
import type { Project } from "@vishnu/api-contract";
import { useProjects } from "@/hooks/queries";

interface ProjectSwitcherProps {
	project: Project;
	onBack: () => void;
	onSelectProject: (id: string) => void;
}

/** Back arrow + project dropdown, shared by the topbar (small screens)
    and the session sidebar title row (md and up). */
export function ProjectSwitcher({ project, onBack, onSelectProject }: ProjectSwitcherProps) {
	const { data: projects } = useProjects();
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={onBack}
				aria-label="Back to projects"
				title="Back to projects"
				className="shrink-0 p-1 text-on-surface-muted hover:bg-raised hover:text-primary-400"
			>
				<Icon icon="ri:arrow-left-line" width={18} />
			</button>

			<Popover
				id="project-switcher"
				position="bottom-right"
				isOpen={open}
				onOpenChange={setOpen}
				ariaLabel="Switch project"
				rootClassName="min-w-0 flex-1"
				triggerClassName="w-full"
				className="pixel-border bg-surface"
				trigger={
					<span className="flex w-full min-w-0 items-center gap-1.5 px-1 py-1 text-left">
						<span className="min-w-0 flex-1 truncate font-display text-lg leading-none text-on-surface">
							{project.name}
						</span>
						<Icon
							icon="ri:arrow-down-s-line"
							width={18}
							className={open ? "shrink-0 text-primary-400" : "shrink-0 text-on-surface-muted"}
						/>
					</span>
				}
			>
				<div className="flex w-64 flex-col gap-1">
					<div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
						{(projects ?? []).map((p) => {
							const active = p.id === project.id;
							const blocked = p.status === "error";
							return (
								<button
									key={p.id}
									type="button"
									disabled={blocked}
									onClick={() => {
										setOpen(false);
										if (!active) onSelectProject(p.id);
									}}
									className={`flex w-full items-center gap-2 px-2 py-1.5 text-left font-display text-sm ${
										active
											? "bg-primary-500/15 text-primary-400"
											: blocked
												? "cursor-not-allowed text-on-surface-muted/50"
												: "text-on-surface hover:bg-raised hover:text-primary-300"
									}`}
								>
									<span className="min-w-0 flex-1 truncate">{p.name}</span>
									{p.status === "cloning" && (
										<span className="shrink-0 text-[10px] uppercase text-info-400">cloning</span>
									)}
									{blocked && (
										<span className="shrink-0 text-[10px] uppercase text-danger-400">error</span>
									)}
									{active && <Icon icon="ri:check-line" width={14} className="shrink-0" />}
								</button>
							);
						})}
						{(projects ?? []).length === 0 && (
							<div className="px-2 py-3 text-center font-display text-sm text-on-surface-muted">
								no projects
							</div>
						)}
					</div>
				</div>
			</Popover>
		</>
	);
}
