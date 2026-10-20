import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@vishnu/ui-component/button";
import { Drawer } from "@vishnu/ui-component/drawer";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { useCrushEvents } from "@/hooks/useCrushEvents";
import { useReportCurrentSession, useSessions } from "@/hooks/queries";
import { usePendingState } from "@/services/pendingStore";
import { TopBar } from "@/features/topbar/TopBar";
import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ChatPane } from "@/features/chat/ChatPane";
import { Composer } from "@/features/chat/Composer";
import { PermissionCard } from "@/features/prompts/PermissionCard";
import { QuestionCard } from "@/features/prompts/QuestionCard";
import type { Project } from "@vishnu/api-contract";

interface AppShellProps {
	project: Project;
	wid: string;
	onSwitchProject: () => void;
	onLogout: () => void;
}

/** Session HUD: topbar, save slots, transcript and composer. */
export function AppShell({ project, wid, onSwitchProject, onLogout }: AppShellProps) {
	const { data: sessions } = useSessions(wid);
	const [activeSessionId, setActiveSessionId] = useState<string>();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const { permissions, questions, busy } = usePendingState();
	const reportCurrent = useReportCurrentSession(wid);

	useCrushEvents(wid);

	// Default to the most recently touched session once the list loads.
	useEffect(() => {
		if (!activeSessionId && sessions && sessions.length > 0) {
			const latest = [...sessions].sort((a, b) => b.updated_at - a.updated_at)[0];
			setActiveSessionId(latest.id);
		}
	}, [sessions, activeSessionId]);

	// Drop the active id if that session disappeared (deleted elsewhere).
	useEffect(() => {
		if (activeSessionId && sessions && !sessions.some((s) => s.id === activeSessionId)) {
			setActiveSessionId(undefined);
		}
	}, [sessions, activeSessionId]);

	// Tell the server which session this tab is viewing so permission and
	// question prompts are scoped to it.
	useEffect(() => {
		if (activeSessionId) reportCurrent.mutate(activeSessionId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeSessionId]);

	const activeSession = sessions?.find((s) => s.id === activeSessionId);

	const selectSession = (id: string) => {
		setActiveSessionId(id);
		setDrawerOpen(false);
	};

	const sessionPermissions = permissions.filter((p) => p.session_id === activeSessionId);
	const sessionQuestions = questions.filter((q) => q.session_id === activeSessionId);

	return (
		<div className="flex h-dvh bg-cabinet text-on-surface">
			{/* Desktop sidebar */}
			<aside className="hidden w-72 shrink-0 border-r-2 border-border bg-surface md:block">
				<SessionSidebar wid={wid} activeId={activeSessionId} onSelect={selectSession} />
			</aside>

			{/* Menu / mobile sessions drawer */}
			<Drawer
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				position="left"
				width="w-72"
				name="sessions-drawer"
				className="border-r-2 border-border bg-surface"
			>
				<div className="flex h-full flex-col">
					<div className="min-h-0 flex-1">
						<SessionSidebar wid={wid} activeId={activeSessionId} onSelect={selectSession} />
					</div>
					<div className="flex flex-col gap-1 border-t-2 border-border pt-3">
						<Button
							variant="outlined"
							size="sm"
							className="font-display"
							icon={<Icon icon="ri:folder-line" width={16} />}
							onClick={() => {
								setDrawerOpen(false);
								onSwitchProject();
							}}
						>
							SWITCH PROJECT
						</Button>
						<Button
							variant="text"
							size="sm"
							color="danger"
							className="font-display"
							onClick={onLogout}
						>
							LOG OUT
						</Button>
					</div>
				</div>
			</Drawer>

			<main className="flex min-w-0 flex-1 flex-col">
				<TopBar
					project={project}
					workspaceId={wid}
					onMenu={() => setDrawerOpen(true)}
					onSwitchProject={onSwitchProject}
					sessionTitle={activeSession?.title}
				/>

				{activeSessionId ? (
					<>
						<ChatPane wid={wid} sid={activeSessionId} />
						{sessionPermissions.map((request) => (
							<PermissionCard key={request.id} wid={wid} request={request} />
						))}
						{sessionQuestions.map((request) => (
							<QuestionCard key={request.id} wid={wid} request={request} />
						))}
						<Composer wid={wid} sid={activeSessionId} busy={!!busy[activeSessionId]} />
					</>
				) : (
					<div className="flex flex-1 items-center justify-center">
						<EmptyState
							text="Pick a session or start a new one"
							className="py-16 font-display text-lg"
						/>
					</div>
				)}
			</main>
		</div>
	);
}
