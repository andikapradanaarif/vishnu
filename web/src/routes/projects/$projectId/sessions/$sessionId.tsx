import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { SessionView } from "@/features/shell/SessionView";

const projectApi = getRouteApi("/projects/$projectId");

export const Route = createFileRoute("/projects/$projectId/sessions/$sessionId")({
	component: SessionPage,
});

function SessionPage() {
	const { sessionId } = Route.useParams();
	const { workspace } = projectApi.useLoaderData();
	return <SessionView wid={workspace.workspace_id} sessionId={sessionId} />;
}
