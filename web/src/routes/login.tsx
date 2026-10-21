import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { fetchUser } from "@/routing/context";

export const Route = createFileRoute("/login")({
	beforeLoad: async ({ context }) => {
		const user = await fetchUser(context).catch(() => undefined);
		if (user) throw redirect({ to: "/projects", replace: true });
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	return <LoginScreen onSuccess={() => navigate({ to: "/projects", replace: true })} />;
}
