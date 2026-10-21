import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchUser } from "@/routing/context";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		const user = await fetchUser(context).catch(() => undefined);
		throw redirect({ to: user ? "/projects" : "/login", replace: true });
	},
});
