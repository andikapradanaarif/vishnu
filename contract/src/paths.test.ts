import { describe, expect, test } from "bun:test";

import { ApiClient, ApiError, buildPath } from "./client";
import { EventsClient } from "./events/sdk";
import { projectBaseUrl, vishnuProjectBase } from "./paths";

describe("projectBaseUrl", () => {
	test("resolves a plain project id", () => {
		expect(projectBaseUrl("abc")).toBe("/p/abc/v1");
	});

	test("encodes path-unsafe ids", () => {
		expect(projectBaseUrl("a/b c")).toBe("/p/a%2Fb%20c/v1");
	});

	test("fills the project base template", () => {
		expect(String(buildPath(vishnuProjectBase, { pid: "abc" }))).toBe("/p/abc/v1");
	});
});

describe("project-scoped crush client", () => {
	test("the events url keeps the project prefix and client_id", () => {
		const api = new ApiClient({
			baseUrl: projectBaseUrl("abc"),
			defaultQuery: { client_id: "c1" },
		});

		expect(new EventsClient(api).url("w1")).toBe(
			"/p/abc/v1/workspaces/w1/events?client_id=c1",
		);
	});
});

describe("ApiError", () => {
	test("exposes the parsed code and flags 401 as an auth error", () => {
		const unauthorized = new ApiError(401, {
			message: "unauthorized",
			code: "unauthorized",
		});
		expect(unauthorized.code).toBe("unauthorized");
		expect(unauthorized.isAuthError).toBe(true);

		const forbidden = new ApiError(403, { message: "nope", code: "forbidden" });
		expect(forbidden.isAuthError).toBe(false);
	});

	test("surfaces the code from an error response", async () => {
		const fakeFetch = (async () =>
			new Response(JSON.stringify({ message: "nope", code: "forbidden" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})) as unknown as typeof fetch;

		const api = new ApiClient({ baseUrl: "/api", fetch: fakeFetch });
		await expect(api.get("/projects")).rejects.toMatchObject({
			status: 403,
			code: "forbidden",
		});
	});
});
