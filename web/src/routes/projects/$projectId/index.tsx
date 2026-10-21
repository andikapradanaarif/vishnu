import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ProjectHome } from "@/features/shell/ProjectHome";

const projectApi = getRouteApi("/projects/$projectId");

export const Route = createFileRoute("/projects/$projectId/")({
	component: ProjectIndexPage,
});

function ProjectIndexPage() {
	const { projectId } = Route.useParams();
	const { workspace } = projectApi.useLoaderData();
	return <ProjectHome projectId={projectId} wid={workspace.workspace_id} />;
}
