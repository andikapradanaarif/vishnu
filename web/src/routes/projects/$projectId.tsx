import { createFileRoute, useRouter } from "@tanstack/react-router";
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

	return (
		<ProjectError
			project={project}
			error={error}
			onRetry={() => router.invalidate()}
			onBack={() => router.navigate({ to: "/projects" })}
		/>
	);
}
