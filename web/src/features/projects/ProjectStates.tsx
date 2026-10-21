import { Button } from "@vishnu/ui-component/button";
import type { Project } from "@vishnu/api-contract";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { errorLabel } from "@/utils/errors";

export function StartingProject({
	project,
	label,
	onBack,
}: {
	project?: Project;
	label: string;
	onBack: () => void;
}) {
	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-3 bg-cabinet px-6 text-center">
			<p className="flex items-center gap-3 font-display text-2xl text-primary-400">
				<LoadingSpinner size={18} className="text-primary-400" /> {label}
			</p>
			{project && (
				<p className="font-display text-lg text-on-surface-muted">{project.name}</p>
			)}
			<Button variant="text" size="sm" className="font-display" onClick={onBack}>
				BACK TO PROJECTS
			</Button>
		</div>
	);
}

export function ProjectError({
	project,
	error,
	onRetry,
	onBack,
}: {
	project?: Project;
	error: unknown;
	onRetry: () => void;
	onBack: () => void;
}) {
	const external = project?.mode === "external";
	const detail = errorLabel(error);

	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-3 bg-cabinet px-6 text-center">
			<p className="glow font-display text-2xl text-danger-400">
				{external ? "EXTERNAL DOWN" : "START FAILED"}
			</p>
			{project && (
				<p className="font-display text-lg text-on-surface">{project.name}</p>
			)}
			<p className="max-w-md text-xs text-on-surface-muted">
				{external && project?.upstream
					? `vishnu can't reach ${project.upstream}. ${detail}`
					: detail}
			</p>
			<div className="mt-2 flex gap-2">
				<Button className="font-display" onClick={onRetry}>
					RETRY
				</Button>
				<Button variant="text" className="font-display" onClick={onBack}>
					BACK TO PROJECTS
				</Button>
			</div>
		</div>
	);
}
