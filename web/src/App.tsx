import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@vishnu/ui-component/drawer";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { useCrushEvents } from "@/hooks/useCrushEvents";
import {
	useReportCurrentSession,
	useSessions,
	useWorkspaces,
} from "@/hooks/queries";
import { usePendingState } from "@/services/pendingStore";
import { TopBar } from "@/features/topbar/TopBar";
import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ChatPane } from "@/features/chat/ChatPane";
import { Composer } from "@/features/chat/Composer";
import { PermissionCard } from "@/features/prompts/PermissionCard";
import { QuestionCard } from "@/features/prompts/QuestionCard";

export default function App() {
	const { data: workspaces, isLoading, error } = useWorkspaces();
	const [workspaceId, setWorkspaceId] = useState<string>();
	const workspace = useMemo(
		() => workspaces?.find((w) => w.id === workspaceId) ?? workspaces?.[0],
		[workspaces, workspaceId],
	);
	const wid = workspace?.id;

	const { data: sessions } = useSessions(wid);
	const [activeSessionId, setActiveSessionId] = useState<string>();
	const activeSession = sessions?.find((s) => s.id === activeSessionId);

	// Default to the most recently touched session once the list loads.
	useEffect(() => {
		if (!activeSessionId && sessions && sessions.length > 0) {
			const latest = [...sessions].sort((a, b) => b.updated_at - a.updated_at)[0];
			setActiveSessionId(latest.id);
		}
	}, [sessions, activeSessionId]);

	useCrushEvents(wid);

	// Tell the server which session this tab is viewing so permission and
	// question prompts are scoped to it. Re-report when the stream (re)opens.
	const { conn, permissions, questions, busy } = usePendingState();
	const reportCurrent = useReportCurrentSession(wid);
	useEffect(() => {
		if (wid && activeSessionId && conn === "open") {
			reportCurrent.mutate(activeSessionId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [wid, activeSessionId, conn]);

	const [drawerOpen, setDrawerOpen] = useState(false);
	const selectSession = (id: string) => {
		setActiveSessionId(id);
		setDrawerOpen(false);
	};

	const pendingPermission = permissions.find((p) => p.session_id === activeSessionId);
	const pendingQuestion = questions.find((q) => q.session_id === activeSessionId);

	if (isLoading) {
		return (
			<div className="flex h-dvh items-center justify-center">
				<LoadingSpinner size={28} />
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex h-dvh items-center justify-center px-6 text-center text-sm text-red-400">
				Couldn't reach crush server — {error.message}
			</div>
		);
	}
	if (!workspace) {
		return (
			<div className="flex h-dvh items-center justify-center">
				<EmptyState text="No workspace — is `crush server` running?" className="py-16" />
			</div>
		);
	}

	return (
		<div className="flex h-dvh bg-neutral-950 text-neutral-200">
			{/* Desktop sidebar */}
			<aside className="hidden w-72 shrink-0 border-r border-neutral-800 md:block">
				<SessionSidebar wid={wid!} activeId={activeSessionId} onSelect={selectSession} />
			</aside>

			{/* Mobile sidebar drawer */}
			<Drawer
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				position="left"
				width="w-72"
				name="sessions-drawer"
				className="bg-neutral-950"
			>
				<SessionSidebar wid={wid!} activeId={activeSessionId} onSelect={selectSession} />
			</Drawer>

			<main className="flex min-w-0 flex-1 flex-col">
				<TopBar
					workspace={workspace}
					workspaces={workspaces ?? []}
					onSelectWorkspace={setWorkspaceId}
					onMenu={() => setDrawerOpen(true)}
					sessionTitle={activeSession?.title}
				/>

				{activeSessionId ? (
					<>
						<ChatPane wid={wid!} sid={activeSessionId} />
						{pendingPermission && (
							<PermissionCard wid={wid!} request={pendingPermission} />
						)}
						{pendingQuestion && <QuestionCard wid={wid!} request={pendingQuestion} />}
						<Composer wid={wid!} sid={activeSessionId} busy={!!busy[activeSessionId]} />
					</>
				) : (
					<div className="flex flex-1 items-center justify-center">
						<EmptyState text="Pick a session or start a new one" className="py-16" />
					</div>
				)}
			</main>
		</div>
	);
}
