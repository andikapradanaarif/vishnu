import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { queryClient } from "@/services/queryClient";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: "intent",
	scrollRestoration: true,
	notFoundMode: "fuzzy",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<div className="crt-scanlines min-h-dvh bg-cabinet text-on-surface">
				<RouterProvider router={router} />
			</div>
		</QueryClientProvider>
	</StrictMode>,
);
