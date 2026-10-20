import { useState } from "react";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { ProjectPicker } from "@/features/projects/ProjectPicker";
import { ProjectError, StartingProject } from "@/features/projects/ProjectStates";
import { AppShell } from "@/features/shell/AppShell";
import { useLogout, useMe, useProjectWorkspace, useProjects } from "@/hooks/queries";
import { bindProject } from "@/services/api";
import { pendingStore } from "@/services/pendingStore";
import { queryClient } from "@/services/queryClient";

const CRUSH_QUERY_ROOTS = [
	"sessions",
	"messages",
	"agent",
	"providers",
	"config",
	"permissions-skip",
	"workspaces",
] as const;

export default function App() {
	const me = useMe();

	if (me.isPending) {
		return (
			<div className="flex h-dvh items-center justify-center bg-cabinet">
				<span className="blink font-display text-xl text-primary-400">▊ LOADING</span>
			</div>
		);
	}

	if (!me.data) {
		return <LoginScreen />;
	}

	return <SignedIn />;
}

function SignedIn() {
	const projects = useProjects();
	const [selectedId, setSelectedId] = useState<string>();
	const workspace = useProjectWorkspace(selectedId);
	const logout = useLogout();

	const project = projects.data?.find((p) => p.id === selectedId);

	const resetCrush = () => {
		bindProject(undefined);
		pendingStore.reset();
		for (const root of CRUSH_QUERY_ROOTS) {
			queryClient.removeQueries({ queryKey: [root] });
		}
	};

	const selectProject = (id: string) => {
		bindProject(id);
		setSelectedId(id);
	};

	const switchProject = () => {
		resetCrush();
		setSelectedId(undefined);
	};

	const signOut = () => {
		resetCrush();
		setSelectedId(undefined);
		logout.mutate();
	};

	if (!selectedId) {
		return <ProjectPicker onSelect={selectProject} onLogout={signOut} />;
	}

	if (projects.isError && !project) {
		return (
			<ProjectError
				error={projects.error}
				onRetry={() => projects.refetch()}
				onBack={switchProject}
			/>
		);
	}

	if (projects.isPending || !project) {
		return <StartingProject label="LOADING PROJECT…" onBack={switchProject} />;
	}

	if (project.status === "cloning" || workspace.isPending) {
		return (
			<StartingProject
				project={project}
				label={project.status === "cloning" ? "CLONING…" : "STARTING…"}
				onBack={switchProject}
			/>
		);
	}

	if (workspace.isError) {
		return (
			<ProjectError
				project={project}
				error={workspace.error}
				onRetry={() => workspace.refetch()}
				onBack={switchProject}
			/>
		);
	}

	if (!workspace.data || workspace.data.status === "down") {
		return (
			<ProjectError
				project={project}
				error={workspace.error ?? new Error("upstream is not reachable")}
				onRetry={() => workspace.refetch()}
				onBack={switchProject}
			/>
		);
	}

	return (
		<AppShell
			key={project.id}
			project={project}
			wid={workspace.data.workspace_id}
			onSwitchProject={switchProject}
			onLogout={signOut}
		/>
	);
}
