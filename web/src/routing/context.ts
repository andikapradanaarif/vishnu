import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { queryKeys } from "@/hooks/queries";
import { authClient, bindProject, projectsClient } from "@/services/api";

export interface RouterContext {
	queryClient: QueryClient;
}

export function fetchUser(context: RouterContext) {
	return context.queryClient.ensureQueryData({
		queryKey: queryKeys.me,
		queryFn: () => authClient.me(),
		staleTime: 30_000,
		retry: false,
	});
}

export async function requireUser(context: RouterContext) {
	try {
		return await fetchUser(context);
	} catch {
		throw redirect({ to: "/login", replace: true });
	}
}

export async function loadProject(context: RouterContext, projectId: string) {
	const [workspace, projects] = await Promise.all([
		context.queryClient.ensureQueryData({
			queryKey: queryKeys.projectWorkspace(projectId),
			queryFn: () => projectsClient.workspace(projectId),
			staleTime: 0,
			retry: 1,
		}),
		context.queryClient.ensureQueryData({
			queryKey: queryKeys.projects,
			queryFn: () => projectsClient.list(),
			staleTime: 0,
		}),
	]);

	const project = projects.find((p) => p.id === projectId);
	if (!project) throw redirect({ to: "/projects", replace: true });
	if (workspace.status === "down") throw new Error("upstream is not reachable");

	bindProject(projectId);
	return { project, workspace };
}
