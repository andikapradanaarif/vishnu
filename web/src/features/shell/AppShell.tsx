import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@vishnu/ui-component/button";
import { Drawer } from "@vishnu/ui-component/drawer";
import { useCrushEvents } from "@/hooks/useCrushEvents";
import { useLogout, useProjects, useSessions } from "@/hooks/queries";
import { resetCrushState } from "@/services/crushState";
import { TopBar } from "@/features/topbar/TopBar";
import { ProjectSwitcher } from "@/features/topbar/ProjectSwitcher";
import { SettingsDialog } from "@/features/settings/SettingsDialog";
import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import type { Project } from "@vishnu/api-contract";

interface AppShellProps {
	project: Project;
	wid: string;
}

/** Session HUD layout: topbar, save slots, drawer and routed content. */
export function AppShell({ project, wid }: AppShellProps) {
	const { data: sessions, isFetching } = useSessions(wid);
	const { data: projects } = useProjects();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const navigate = useNavigate();
	const logout = useLogout();
	const params = useParams({ strict: false }) as { sessionId?: string };
	const activeSessionId = params.sessionId;
	// The route loader's copy is a snapshot; the registry query is what
	// the settings dialog writes to, so prefer the fresher one.
	const current = projects?.find((p) => p.id === project.id) ?? project;

	useCrushEvents(wid);

	// If the URL points at a deleted session, fall back to the project home.
	useEffect(() => {
		if (isFetching) return;
		if (activeSessionId && sessions && !sessions.some((s) => s.id === activeSessionId)) {
			navigate({
				to: "/projects/$projectId",
				params: { projectId: project.id },
				replace: true,
			});
		}
	}, [activeSessionId, sessions, isFetching, navigate, project.id]);

	const selectSession = (id: string) => {
		setDrawerOpen(false);
		navigate({
			to: "/projects/$projectId/sessions/$sessionId",
			params: { projectId: project.id, sessionId: id },
		});
	};

	const switchProject = () => {
		resetCrushState();
		navigate({ to: "/projects" });
	};

	const selectProject = (id: string) => {
		if (id === project.id) return;
		resetCrushState();
		navigate({ to: "/projects/$projectId", params: { projectId: id } });
	};

	const signOut = () => {
		resetCrushState();
		logout.mutate(undefined, {
			onSuccess: () => navigate({ to: "/login", replace: true }),
		});
	};

	return (
		<div className="flex h-dvh overflow-x-hidden bg-cabinet text-on-surface">
			{/* Desktop sidebar */}
			<aside className="hidden w-72 shrink-0 border-r-2 border-border bg-surface md:block">
				<SessionSidebar
					wid={wid}
					activeId={activeSessionId}
					onSelect={selectSession}
					header={
						<ProjectSwitcher
							project={project}
							onBack={switchProject}
							onSelectProject={selectProject}
						/>
					}
				/>
			</aside>

			{/* Menu / mobile sessions drawer */}
			<Drawer
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				position="left"
				width="w-72"
				name="menu-drawer"
				title="Menu"
				className="border-r-2 border-border bg-surface"
			>
				<div className="flex h-full flex-col">
					<div className="min-h-0 flex-1 md:hidden">
						<SessionSidebar
							wid={wid}
							activeId={activeSessionId}
							onSelect={selectSession}
							header={
								<ProjectSwitcher
									project={project}
									onBack={() => {
										setDrawerOpen(false);
										switchProject();
									}}
									onSelectProject={(id) => {
										setDrawerOpen(false);
										selectProject(id);
									}}
								/>
							}
						/>
					</div>
					<div className="flex flex-col gap-1 border-t-2 border-border pt-3 md:border-t-0 md:pt-0">
						<Button
							variant="outlined"
							size="md"
							color="danger"
							className="w-full justify-start font-display"
							icon={<Icon icon="ri:logout-box-line" width={16} />}
							onClick={() => {
								setDrawerOpen(false);
								signOut();
							}}
						>
							LOG OUT
						</Button>
					</div>
				</div>
			</Drawer>

			<main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
				<TopBar
					project={project}
					workspaceId={wid}
					sessionId={activeSessionId}
					menuOpen={drawerOpen}
					onMenu={() => setDrawerOpen((open) => !open)}
					onSwitchProject={switchProject}
					onSelectProject={selectProject}
					onSettings={() => setSettingsOpen(true)}
				/>
				<Outlet />
			</main>

			{settingsOpen && (
				<SettingsDialog
					pid={current.id}
					wid={wid}
					sid={activeSessionId}
					workspaceSkip={current.permission_skip}
					isOpen
					onClose={() => setSettingsOpen(false)}
				/>
			)}
		</div>
	);
}
