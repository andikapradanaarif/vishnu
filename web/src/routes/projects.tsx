import { Outlet, createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/routing/context";

export const Route = createFileRoute("/projects")({
	beforeLoad: ({ context }) => requireUser(context),
	component: ProjectsLayout,
});

function ProjectsLayout() {
	return <Outlet />;
}
