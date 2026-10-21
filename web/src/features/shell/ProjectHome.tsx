import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@vishnu/ui-component/emptyState";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { useCreateSession, useSessions } from "@/hooks/queries";

interface ProjectHomeProps {
	projectId: string;
	wid: string;
}

/**
 * Project landing: open the most recently touched session, or — a fresh
 * project has none — create the first session so there's never a dead
 * empty screen after entering.
 */
export function ProjectHome({ projectId, wid }: ProjectHomeProps) {
	const { data: sessions, isLoading } = useSessions(wid);
	const createSession = useCreateSession(wid);
	const navigate = useNavigate();
	const bootstrapping = useRef(false);

	useEffect(() => {
		if (isLoading || !sessions || bootstrapping.current) return;

		const toSession = (sessionId: string) =>
			navigate({
				to: "/projects/$projectId/sessions/$sessionId",
				params: { projectId, sessionId },
				replace: true,
			});

		if (sessions.length === 0) {
			bootstrapping.current = true;
			createSession.mutate(undefined, {
				onSuccess: (session) => toSession(session.id),
				onError: () => {
					bootstrapping.current = false;
				},
			});
			return;
		}

		const latest = [...sessions].sort((a, b) => b.updated_at - a.updated_at)[0];
		toSession(latest.id);
	}, [sessions, isLoading, projectId, createSession, navigate]);

	if (bootstrapping.current || createSession.isPending) {
		return (
			<div className="flex flex-1 items-center justify-center gap-3 font-display text-lg text-on-surface-muted">
				<LoadingSpinner size={18} className="text-primary-400" />
				preparing a session…
			</div>
		);
	}

	return (
		<div className="flex flex-1 items-center justify-center">
			<EmptyState
				text="Pick a session or start a new one"
				className="py-16 font-display text-lg"
			/>
		</div>
	);
}
