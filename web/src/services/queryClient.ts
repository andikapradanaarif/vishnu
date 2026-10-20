import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@vishnu/api-contract/client";

const authKey = ["auth", "me"] as const;

/**
 * A 401 from any request means the session died. Re-check `me` so the
 * gate flips to the login screen; auth calls themselves are skipped to
 * avoid invalidating the query that is already reporting the failure.
 */
function handleAuthError(error: unknown, key: readonly unknown[] | undefined): void {
	if (!(error instanceof ApiError) || !error.isAuthError) return;
	if (key?.[0] === "auth") return;
	queryClient.invalidateQueries({ queryKey: authKey });
}

/**
 * Single query client for the app.
 *
 * Retries are off for 4xx responses — deterministic failures shouldn't
 * be retried. Transient failures (network, 5xx) retry twice.
 */
export const queryClient: QueryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => handleAuthError(error, query.queryKey),
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) =>
			handleAuthError(error, mutation.options.mutationKey),
	}),
	defaultOptions: {
		queries: {
			staleTime: 15_000,
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
					return false;
				}
				return failureCount < 2;
			},
		},
	},
});
