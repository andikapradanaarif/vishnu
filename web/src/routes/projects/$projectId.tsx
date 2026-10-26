import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { ProjectError, StartingProject } from "@/features/projects/ProjectStates";
import { AppShell } from "@/features/shell/AppShell";
import { useProjects } from "@/hooks/queries";
import { loadProject } from "@/routing/context";

export const Route = createFileRoute("/projects/$projectId")({
	loader: ({ context, params }) => loadProject(context, params.projectId),
	pendingComponent: ProjectPending,
	errorComponent: ProjectRouteError,
	component: ProjectPage,
});

function ProjectPage() {
	const { project, workspace } = Route.useLoaderData();
	return <AppShell project={project} wid={workspace.workspace_id} />;
}

function ProjectPending() {
	const router = useRouter();
	return <StartingProject label="STARTING…" onBack={() => router.navigate({ to: "/projects" })} />;
}

function ProjectRouteError({ error }: { error: unknown }) {
	const router = useRouter();
	const { data: projects } = useProjects();
	const { projectId } = Route.useParams();
	const project = projects?.find((p) => p.id === projectId);

	// After a long idle the crush child may still be respawning when the
	// loader runs — retry on a timer so the page recovers on its own.
	useEffect(() => {
		const t = setInterval(() => router.invalidate(), 5000);
		return () => clearInterval(t);
	}, [router]);

	return (
		<ProjectError
			project={project}
			error={error}
			onRetry={() => router.invalidate()}
			onBack={() => router.navigate({ to: "/projects" })}
		/>
	);
}
