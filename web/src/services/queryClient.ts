import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@vishnu/api-contract/client";

/**
 * Single query client for the app.
 *
 * Retries are off for 4xx responses — deterministic failures shouldn't
 * be retried. Transient failures (network, 5xx) retry twice.
 */
export const queryClient = new QueryClient({
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
