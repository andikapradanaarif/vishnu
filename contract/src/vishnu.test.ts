import { describe, expect, test } from "bun:test";

import { AuthClient } from "./auth/sdk";
import { ApiClient } from "./client";
import { ProjectsClient } from "./projects/sdk";
import { UsersClient } from "./users/sdk";

interface Call {
	url: string;
	method: string;
	body?: unknown;
}

function stub(responses: Array<() => Response>, calls: Call[]): ApiClient {
	const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		calls.push({
			url: String(input),
			method: init?.method ?? "GET",
			body: init?.body ? JSON.parse(String(init.body)) : undefined,
		});
		const next = responses.shift();
		if (!next) throw new Error("no response queued");
		return next();
	}) as unknown as typeof fetch;

	return new ApiClient({ baseUrl: "/api", fetch: fakeFetch });
}

function json(status: number, payload: unknown): () => Response {
	return () =>
		new Response(JSON.stringify(payload), {
			status,
			headers: { "Content-Type": "application/json" },
		});
}

describe("ProjectsClient", () => {
	test("lists the bare array the API returns", async () => {
		const calls: Call[] = [];
		const api = stub(
			[json(200, [{ id: "p1", name: "one", mode: "managed", status: "up" }])],
			calls,
		);

		const projects = await new ProjectsClient(api).list();
		expect(projects).toHaveLength(1);
		expect(calls[0]?.url).toBe("/api/projects");
		expect(calls[0]?.method).toBe("GET");
	});

	test("unwraps the project from a create", async () => {
		const calls: Call[] = [];
		const api = stub(
			[
				json(201, {
					project: { id: "p1", name: "one", mode: "managed", status: "cloning" },
				}),
			],
			calls,
		);

		const project = await new ProjectsClient(api).create({
			repo_url: "owner/repo",
		});
		expect(project.id).toBe("p1");
		expect(calls[0]?.method).toBe("POST");
		expect(calls[0]?.body).toEqual({ repo_url: "owner/repo" });
	});

	test("returns the workspace triple", async () => {
		const calls: Call[] = [];
		const api = stub(
			[
				json(200, {
					workspace_id: "w1",
					upstream: "http://127.0.0.1:9201",
					status: "up",
				}),
			],
			calls,
		);

		const workspace = await new ProjectsClient(api).workspace("p1");
		expect(workspace.workspace_id).toBe("w1");
		expect(calls[0]?.url).toBe("/api/projects/p1/workspace");
	});

	test("deletes with a 204", async () => {
		const calls: Call[] = [];
		const api = stub([() => new Response(null, { status: 204 })], calls);

		await new ProjectsClient(api).delete("p1");
		expect(calls[0]?.url).toBe("/api/projects/p1");
		expect(calls[0]?.method).toBe("DELETE");
	});
});

describe("AuthClient", () => {
	test("unwraps me and verify", async () => {
		const calls: Call[] = [];
		const user = { id: "u1", email: "a@example.com", role: "admin" };
		const api = stub([json(200, { user }), json(200, { user })], calls);
		const auth = new AuthClient(api);

		expect((await auth.me()).email).toBe("a@example.com");
		expect((await auth.verify("a@example.com", "123456")).role).toBe("admin");
		expect(calls[0]?.url).toBe("/api/auth/me");
		expect(calls[1]?.body).toEqual({ email: "a@example.com", code: "123456" });
	});

	test("logout posts and tolerates the 204", async () => {
		const calls: Call[] = [];
		const api = stub([() => new Response(null, { status: 204 })], calls);

		await new AuthClient(api).logout();
		expect(calls[0]?.url).toBe("/api/auth/logout");
		expect(calls[0]?.method).toBe("POST");
	});
});

describe("UsersClient", () => {
	test("creates a user and surfaces forbidden", async () => {
		const calls: Call[] = [];
		const api = stub(
			[
				json(201, { user: { id: "u2", email: "b@example.com", role: "member" } }),
				json(403, { message: "admin access required", code: "forbidden" }),
			],
			calls,
		);
		const users = new UsersClient(api);

		expect((await users.create({ email: "b@example.com" })).id).toBe("u2");
		await expect(users.create({ email: "c@example.com" })).rejects.toMatchObject({
			status: 403,
			code: "forbidden",
		});
	});
});

describe("vishnu client", () => {
	test("never sends client_id query params", async () => {
		const calls: Call[] = [];
		const api = stub([json(200, [])], calls);

		await new ProjectsClient(api).list();
		expect(calls[0]?.url).toBe("/api/projects");
	});
});
