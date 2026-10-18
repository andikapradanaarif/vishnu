import type { ErrorBody } from "./types";

/**
 * A resolved URL path produced by `buildPath`. This is a runtime string
 * derived from a contract path template with path parameters substituted.
 */
export type ResolvedPath = string & { readonly __resolved: unique symbol };

/**
 * Extracts path parameter names from a path template string
 * and maps them to required keys in a params object.
 * @example ExtractParam<"/workspaces/{id}"> → { id: string | number }
 */
type ExtractParam<T extends string, Acc extends Record<string, string | number> = {}> =
	T extends `${string}{${infer Param}}${infer Rest}`
		? ExtractParam<Rest, Acc & { [K in Param]: string | number }>
		: Acc;

/**
 * Builds a runtime URL path from a contract path template by substituting
 * path parameters (e.g. "/workspaces/{id}").
 *
 * @example
 * buildPath("/workspaces/{id}", { id: "abc" }); // "/workspaces/abc"
 */
export function buildPath<T extends string>(
	template: T,
	params: ExtractParam<T>,
): ResolvedPath {
	let result = template as string;
	const sortedKeys = (Object.keys(params) as string[]).sort(
		(a, b) => b.length - a.length,
	);
	for (const key of sortedKeys) {
		result = result.replaceAll("{" + key + "}", encodeURIComponent(String((params as Record<string, string | number>)[key])));
	}
	if (result.includes("{") || result.includes("}")) {
		throw new Error(
			`buildPath: unfilled placeholders remain in "${result}" (template: "${template}")`,
		);
	}
	return result as ResolvedPath;
}

/**
 * Appends query params to a path. undefined/null values are skipped so
 * optional params don't produce `?key=undefined`.
 */
export function withQuery(path: string, params?: Record<string, string | number | boolean | null | undefined>): ResolvedPath {
	if (!params) return path as ResolvedPath;
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) continue;
		qs.set(key, String(value));
	}
	const str = qs.toString();
	return (str ? `${path}?${str}` : path) as ResolvedPath;
}

/** Error thrown when an API request returns a non-2xx response. */
export class ApiError extends Error {
	/** HTTP status code. */
	readonly status: number;
	/** Parsed error body from the response, if available. */
	readonly body: ErrorBody;

	constructor(status: number, body: ErrorBody) {
		super(body.message || `API error ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

/** Constructor options for {@link ApiClient}. */
export interface ApiClientOptions {
	/** Base URL of the API (trailing slash is stripped). Defaults to "/v1" (same-origin). */
	baseUrl?: string;
	/** Custom fetch implementation (defaults to global `fetch`). */
	fetch?: typeof fetch;
	/** Default headers applied to every request. */
	defaultHeaders?: Record<string, string>;
	/**
	 * Query params applied to every request — crush requires
	 * `client_id` (a per-tab UUID) on most endpoints.
	 */
	defaultQuery?: Record<string, string | number | boolean>;
}

/**
 * Base HTTP client for the crush server API. Crush returns raw JSON
 * (no success envelope) and `{message}` on errors.
 *
 * Domain-specific SDK classes (e.g. `SessionsClient`) accept an
 * `ApiClient` instance and delegate requests to it.
 *
 * @example
 * const api = new ApiClient({ baseUrl: "/v1", defaultQuery: { client_id: clientId() } });
 * const sessions = new SessionsClient(api);
 */
export class ApiClient {
	protected readonly baseUrl: string;
	protected readonly fetchFn: typeof fetch;
	protected readonly defaultHeaders: Record<string, string>;
	protected readonly defaultQuery: Record<string, string | number | boolean>;

	constructor(opts: ApiClientOptions = {}) {
		this.baseUrl = (opts.baseUrl ?? "/v1").replace(/\/+$/, "");
		this.fetchFn = opts.fetch ?? fetch;
		this.defaultHeaders = {
			"Accept": "application/json",
			...opts.defaultHeaders,
		};
		this.defaultQuery = opts.defaultQuery ?? {};
	}

	/** Core request method — returns parsed JSON, throws ApiError on non-2xx. */
	protected async request<T>(path: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${withQuery(path, this.defaultQuery)}`;
		const headers = new Headers(this.defaultHeaders);
		if (options.headers) {
			const incoming = new Headers(options.headers);
			incoming.forEach((value, key) => { headers.set(key, value); });
		}
		if (options.body && !headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}
		const res = await this.fetchFn(url, { ...options, headers });
		if (!res.ok) {
			let body: ErrorBody;
			try {
				const parsed = await res.json();
				body = (typeof parsed === "object" && parsed !== null)
					? parsed as ErrorBody
					: { message: res.statusText || `HTTP ${res.status}` };
			} catch {
				body = { message: res.statusText || `HTTP ${res.status}` };
			}
			throw new ApiError(res.status, body);
		}
		if (res.status === 204) {
			return undefined as T;
		}
		const text = await res.text();
		if (!text) {
			return undefined as T;
		}
		return JSON.parse(text) as T;
	}

	get<T>(path: string | ResolvedPath): Promise<T> {
		return this.request<T>(path);
	}

	post<T>(path: string | ResolvedPath, body?: unknown): Promise<T> {
		return this.request<T>(path, {
			method: "POST",
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	}

	delete<T>(path: string | ResolvedPath): Promise<T> {
		return this.request<T>(path, { method: "DELETE" });
	}

	/**
	 * Resolves a path to a full URL including defaultQuery — for APIs
	 * consumed outside fetch (EventSource for the SSE stream).
	 */
	resolveUrl(path: string | ResolvedPath): string {
		return `${this.baseUrl}${withQuery(path, this.defaultQuery)}`;
	}
}
