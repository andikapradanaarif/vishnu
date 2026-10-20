import { useState } from "react";
import { Button } from "@vishnu/ui-component/button";
import { Chip, type ChipColorsType } from "@vishnu/ui-component/chip";
import { Dialog } from "@vishnu/ui-component/dialog";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { useDeleteProject, useProjects } from "@/hooks/queries";
import type { Project, ProjectStatus } from "@vishnu/api-contract";
import { AddProjectDialog } from "./AddProjectDialog";

interface ProjectPickerProps {
	onSelect: (id: string) => void;
	onLogout: () => void;
}

const STATUS_COLORS: Record<ProjectStatus, ChipColorsType> = {
	up: "green",
	starting: "orange",
	cloning: "orange",
	down: "grey",
	error: "red",
};

function isSelectable(project: Project): boolean {
	return project.status !== "cloning" && project.status !== "error";
}

function secondaryLine(project: Project): string | undefined {
	return project.mode === "external" ? project.upstream : project.path;
}

/** Main menu: the registered projects, with add and delete. */
export function ProjectPicker({ onSelect, onLogout }: ProjectPickerProps) {
	const { data: projects, isLoading, error } = useProjects();
	const deleteProject = useDeleteProject();
	const [addOpen, setAddOpen] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<Project>();
	const [actionError, setActionError] = useState<string>();

	const confirmDelete = () => {
		if (!pendingDelete) return;
		setActionError(undefined);
		deleteProject.mutate(pendingDelete.id, {
			onSuccess: () => setPendingDelete(undefined),
			onError: (err) => setActionError(err.message),
		});
	};

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 py-10">
			<div className="flex items-center justify-between">
				<h1 className="text-lg font-semibold tracking-[0.25em] text-neutral-100">
					SELECT PROJECT
				</h1>
				<Button variant="text" size="sm" onClick={onLogout}>
					Log out
				</Button>
			</div>

			{isLoading && (
				<div className="flex justify-center py-12">
					<LoadingSpinner size={22} />
				</div>
			)}
			{error && <p className="text-sm text-danger-400">{error.message}</p>}
			{actionError && <p className="text-sm text-danger-400">{actionError}</p>}

			{!isLoading && !error && (projects ?? []).length === 0 && (
				<div className="flex flex-col items-center gap-4 py-16">
					<EmptyState text="INSERT COIN" className="py-4" />
					<Button onClick={() => setAddOpen(true)}>+ New project</Button>
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
							className={`group flex items-start gap-2 rounded-md border border-neutral-800 px-3 py-2 ${
								selectable
									? "cursor-pointer hover:border-neutral-600 hover:bg-neutral-900"
									: "opacity-60"
							}`}
						>
							<span
								className={`mt-0.5 shrink-0 text-xs ${
									selectable
										? "text-neutral-600 group-hover:text-primary-400"
										: "text-neutral-700"
								}`}
							>
								▸
							</span>

							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									<span className="truncate text-sm text-neutral-100">{project.name}</span>
									<Chip
										size="sm"
										variant="solid"
										color={project.mode === "managed" ? "blue" : "indigo"}
									>
										{project.mode.toUpperCase()}
									</Chip>
									<Chip
										size="sm"
										color={STATUS_COLORS[project.status]}
										className={project.status === "cloning" ? "animate-pulse" : undefined}
									>
										{project.status.toUpperCase()}
									</Chip>
								</div>
								{secondary && (
									<div className="truncate text-xs text-neutral-500">{secondary}</div>
								)}
								{project.status === "cloning" && (
									<div className="text-xs text-warning-400">cloning…</div>
								)}
								{project.status === "error" && project.error && (
									<div className="text-xs text-danger-400">{project.error}</div>
								)}
							</div>

							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									setPendingDelete(project);
								}}
								className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-danger-950 hover:text-danger-400"
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
					className="rounded-md border border-dashed border-neutral-800 px-3 py-2 text-left text-sm text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
				>
					+ New project
				</button>
			)}

			<Dialog
				isOpen={!!pendingDelete}
				onClose={() => setPendingDelete(undefined)}
				title={pendingDelete ? `Delete ${pendingDelete.name}?` : "Delete project?"}
				className="w-full max-w-md"
			>
				<p className="text-sm text-neutral-400">
					Crush is stopped for managed projects. Files on disk are not touched.
				</p>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="text" onClick={() => setPendingDelete(undefined)}>
						Cancel
					</Button>
					<Button
						color="danger"
						onClick={confirmDelete}
						isLoading={deleteProject.isPending}
					>
						Delete
					</Button>
				</div>
			</Dialog>

			<AddProjectDialog isOpen={addOpen} onClose={() => setAddOpen(false)} />
		</div>
	);
}
