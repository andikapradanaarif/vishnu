import { Button } from "@vishnu/ui-component/button";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { ApiError } from "@vishnu/api-contract/client";
import type { Project } from "@vishnu/api-contract";

function errorText(error: unknown): string {
	if (error instanceof ApiError) return error.body.message || error.message;
	return error instanceof Error ? error.message : "unknown error";
}

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
		<div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
			<LoadingSpinner size={26} />
			<p className="text-sm text-neutral-300">{label}</p>
			{project && <p className="text-xs text-neutral-500">{project.name}</p>}
			<Button variant="text" size="sm" onClick={onBack}>
				Back to projects
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
	const detail = errorText(error);

	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
			<p className="text-sm font-medium text-danger-400">
				{external ? "EXTERNAL DOWN" : "START FAILED"}
			</p>
			{project && <p className="text-sm text-neutral-200">{project.name}</p>}
			<p className="max-w-md text-xs text-neutral-500">
				{external && project?.upstream
					? `vishnu can't reach ${project.upstream}. ${detail}`
					: detail}
			</p>
			<div className="mt-2 flex gap-2">
				<Button onClick={onRetry}>Retry</Button>
				<Button variant="text" onClick={onBack}>
					Back to projects
				</Button>
			</div>
		</div>
	);
}
