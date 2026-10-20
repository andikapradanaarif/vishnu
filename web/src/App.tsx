import { Button } from "@vishnu/ui-component/button";
import { LoadingSpinner } from "@vishnu/ui-component/loadingAnimation";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { useLogout, useMe } from "@/hooks/queries";

export default function App() {
	const me = useMe();
	const logout = useLogout();

	if (me.isPending) {
		return (
			<div className="flex h-dvh items-center justify-center">
				<LoadingSpinner size={28} />
			</div>
		);
	}

	if (!me.data) {
		return <LoginScreen />;
	}

	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
			<p className="text-sm text-neutral-400">
				Signed in as <span className="text-neutral-100">{me.data.email}</span>
			</p>
			<Button
				variant="outlined"
				onClick={() => logout.mutate()}
				isLoading={logout.isPending}
			>
				Log out
			</Button>
		</div>
	);
}
