import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProjectPicker } from "@/features/projects/ProjectPicker";
import { useLogout } from "@/hooks/queries";
import { resetCrushState } from "@/services/crushState";

export const Route = createFileRoute("/projects/")({
	component: ProjectsPage,
});

function ProjectsPage() {
	const navigate = useNavigate();
	const logout = useLogout();

	const signOut = () => {
		resetCrushState();
		logout.mutate(undefined, {
			onSuccess: () => navigate({ to: "/login", replace: true }),
		});
	};

	return (
		<ProjectPicker
			onSelect={(id) => navigate({ to: "/projects/$projectId", params: { projectId: id } })}
			onLogout={signOut}
		/>
	);
}
