import { ApiError } from "@vishnu/api-contract/client";

/**
 * Human-readable error including the server's machine code when present
 * (`[invalid_code] wrong code`), so inline banners stay actionable.
 */
export function errorLabel(error: unknown, fallback = "unknown error"): string {
	if (error instanceof ApiError) {
		const detail = error.body.message || error.message;
		return error.code ? `[${error.code}] ${detail}` : detail;
	}
	return error instanceof Error ? error.message : fallback;
}
