import { useEffect } from "react";
import {
	Outlet,
	createRootRouteWithContext,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useMe } from "@/hooks/queries";
import type { RouterContext } from "@/routing/context";

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
	notFoundComponent: NotFound,
});

function RootLayout() {
	const me = useMe();
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (state) => state.location.pathname });

	useEffect(() => {
		if (me.isError && pathname !== "/login") {
			navigate({ to: "/login", replace: true });
		}
	}, [me.isError, pathname, navigate]);

	return <Outlet />;
}

function NotFound() {
	return (
		<div className="flex h-dvh items-center justify-center font-display text-lg text-on-surface-muted">
			Page not found
		</div>
	);
}
