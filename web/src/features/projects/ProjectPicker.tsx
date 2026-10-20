import { useState } from "react";
import { Button } from "@vishnu/ui-component/button";
import { Chip } from "@vishnu/ui-component/chip";
import { Dialog } from "@vishnu/ui-component/dialog";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { useDeleteProject, useProjects } from "@/hooks/queries";
import { errorLabel } from "@/utils/errors";
import type { Project, ProjectMode, ProjectStatus } from "@vishnu/api-contract";
import { AddProjectDialog } from "./AddProjectDialog";

interface ProjectPickerProps {
	onSelect: (id: string) => void;
	onLogout: () => void;
}

const MODE_CLASS: Record<ProjectMode, string> = {
	managed: "!rounded-sm border border-info-500/50 bg-info-500/10 text-info-300",
	external: "!rounded-sm border border-pink-500/50 bg-pink-500/10 text-pink-300",
};

const STATUS_CLASS: Record<ProjectStatus, string> = {
	up: "!rounded-sm border border-success-500/50 bg-success-500/10 text-success-300",
	starting: "!rounded-sm border border-warning-500/50 bg-warning-500/10 text-warning-300",
	cloning: "!rounded-sm border border-warning-500/50 bg-warning-500/10 text-warning-300 blink",
	down: "!rounded-sm border border-border bg-raised text-ghost",
	error: "!rounded-sm border border-danger-500/50 bg-danger-500/10 text-danger-300",
};

function isSelectable(project: Project): boolean {
	return project.status !== "cloning" && project.status !== "error";
}

function secondaryLine(project: Project): string | undefined {
	return project.mode === "external" ? project.upstream : project.path;
}

/** Main menu: the registered projects, with add and delete. */
export function ProjectPicker({ onSelect, onLogout }: ProjectPickerProps) {
	const { data: projects, isLoading, error, refetch, isFetching } = useProjects();
	const deleteProject = useDeleteProject();
	const [addOpen, setAddOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Project>();
	const [actionError, setActionError] = useState<string>();

	const confirmDelete = () => {
		if (!pendingDelete) return;
		setActionError(undefined);
		deleteProject.mutate(pendingDelete.id, {
			onSuccess: () => setPendingDelete(undefined),
			onError: (err) => setActionError(errorLabel(err)),
		});
	};

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 py-10">
			<div className="flex items-center justify-between">
				<h1 className="glow font-logo text-xs tracking-[0.2em] text-primary-400">
					SELECT PROJECT
				</h1>
				<Button variant="text" size="sm" className="font-display" onClick={onLogout}>
					LOG OUT
				</Button>
			</div>

			{isLoading && (
				<div className="py-12 text-center font-display text-lg text-on-surface-muted">
					<span className="blink text-primary-400">▊</span> loading projects…
				</div>
			)}
			{error && (
				<div className="flex items-center gap-3">
					<p className="font-display text-sm text-danger-400">{errorLabel(error)}</p>
					<Button
						size="sm"
						variant="outlined"
						className="font-display"
						isLoading={isFetching}
						onClick={() => refetch()}
					>
						RETRY
					</Button>
				</div>
			)}
			{actionError && (
				<p className="font-display text-sm text-danger-400">{actionError}</p>
			)}

			{!isLoading && !error && (projects ?? []).length === 0 && (
				<div className="flex flex-col items-center gap-5 py-16">
					<EmptyState text="INSERT COIN" className="py-4 font-display text-2xl" />
					<Button
						className="font-display text-lg tracking-[0.2em]"
						onClick={() => setAddOpen(true)}
					>
						+ NEW PROJECT
					</Button>
				</div>
			)}

			<div className="flex flex-col gap-1">
				{(projects ?? []).map((project) => {
					const selectable = isSelectable(project);
					const secondary = secondaryLine(project);
					return (
						<div
							key={project.id}
							role={selectable ? "button" : undefined}
							tabIndex={selectable ? 0 : -1}
							onClick={() => selectable && onSelect(project.id)}
							onKeyDown={(event) => {
								if (selectable && (event.key === "Enter" || event.key === " ")) {
									event.preventDefault();
									onSelect(project.id);
								}
							}}
							className={`group flex items-start gap-2 border-2 px-3 py-2 ${
								selectable
									? "cursor-pointer border-border bg-surface hover:border-primary-500 hover:bg-raised"
									: "border-line bg-surface/60 opacity-70"
							}`}
						>
							<span
								className={`mt-0.5 shrink-0 font-display text-lg ${
									selectable
										? "text-ghost group-hover:text-primary-400"
										: "text-line"
								}`}
							>
								▸
							</span>

							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="truncate font-display text-xl text-on-surface">
										{project.name}
									</span>
									<Chip
										size="sm"
										color="custom"
										colorClassName={MODE_CLASS[project.mode]}
									>
										{project.mode.toUpperCase()}
									</Chip>
									<Chip
										size="sm"
										color="custom"
										colorClassName={STATUS_CLASS[project.status]}
									>
										{project.status.toUpperCase()}
									</Chip>
								</div>
								{secondary && (
									<div className="truncate text-xs text-on-surface-muted">{secondary}</div>
								)}
								{project.status === "cloning" && (
									<div className="font-display text-sm text-warning-300">cloning…</div>
								)}
								{project.status === "error" && project.error && (
									<div className="font-display text-sm text-danger-300">{project.error}</div>
								)}
							</div>

							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									setPendingDelete(project);
								}}
								className="mt-0.5 shrink-0 px-1.5 py-0.5 font-display text-xs text-ghost hover:bg-danger-950 hover:text-danger-400"
								aria-label={`Delete ${project.name}`}
							>
								DEL
							</button>
						</div>
					);
				})}
			</div>

			{(projects ?? []).length > 0 && (
				<button
					type="button"
					onClick={() => setAddOpen(true)}
					className="border-2 border-dashed border-border px-3 py-2 text-left font-display text-lg text-on-surface-muted hover:border-primary-500 hover:text-primary-300"
				>
					+ NEW PROJECT
				</button>
			)}

			<Dialog
				isOpen={!!pendingDelete}
				onClose={() => setPendingDelete(undefined)}
				title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete project?"}
				className="w-full max-w-md pixel-border bg-surface"
			>
				<p className="text-sm text-on-surface-muted">
					Crush is stopped for managed projects. Files on disk are not touched.
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="text" className="font-display" onClick={() => setPendingDelete(undefined)}>
						CANCEL
					</Button>
					<Button
						color="danger"
						className="font-display"
						onClick={confirmDelete}
						isLoading={deleteProject.isPending}
					>
						DELETE
					</Button>
				</div>
			</Dialog>

			<AddProjectDialog isOpen={addOpen} onClose={() => setAddOpen(false)} />
		</div>
	);
}
