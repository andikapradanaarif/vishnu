import { Button } from "@vishnu/ui-component/button";
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
		<div className="flex h-dvh flex-col items-center justify-center gap-3 bg-cabinet px-6 text-center">
			<p className="font-display text-2xl text-primary-400">
				<span className="blink">▊</span> {label}
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
	const detail = errorText(error);

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
