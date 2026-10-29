// @ts-nocheck
/**
 * Dev-only mock of the vishnu + crush API surfaces, so the SPA can be
 * exercised without Postgres, the Go API, or a crush binary.
 *
 *   bun run mock   # :8081
 *   bun run dev:mock
 *
 * Sign in with any email and code 123456 (`000000` simulates a wrong
 * code). The mock ships a project menu, two sessions, message history,
 * a pending permission, a pending question, and canned agent replies.
 */
const PORT = Number(process.env.MOCK_PORT ?? 8081);

const user = { id: "u1", email: "demo@vishnu.local", name: "Demo", role: "admin" };
let loggedIn = false;
let skipPermissions = false;

const now = () => Math.floor(Date.now() / 1000);

type Json = Record<string, unknown>;

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...headers },
	});
}

function noContent(headers: Record<string, string> = {}) {
	return new Response(null, { status: 204, headers });
}

function unauthorized() {
	return json({ message: "unauthorized", code: "unauthorized" }, 401);
}

async function body(req: Request): Promise<Json> {
	try {
		return (await req.json()) as Json;
	} catch {
		return {};
	}
}

// ── projects ────────────────────────────────────────────────────────

type Project = {
	id: string;
	name: string;
	mode: "managed" | "external";
	status: "cloning" | "error" | "down" | "starting" | "up";
	path?: string;
	upstream?: string;
	port?: number;
	error?: string;
};

let projects: Project[] = [
	{
		id: "p1",
		name: "vishnu",
		mode: "managed",
		status: "up",
		path: "/Users/you/src/vishnu",
		port: 9201,
	},
	{
		id: "p2",
		name: "crush",
		mode: "managed",
		status: "up",
		path: "/Users/you/src/crush",
		port: 9202,
	},
	{
		id: "p3",
		name: "legacy-daemon",
		mode: "external",
		status: "down",
		upstream: "http://127.0.0.1:9999",
	},
	{
		id: "p4",
		name: "broken-clone",
		mode: "managed",
		status: "error",
		path: "/tmp/broken",
		error: "repository not found",
	},
	{ id: "p5", name: "new-clone", mode: "managed", status: "cloning", path: "/tmp/new-clone" },
];

let cloneFlipsAt = Date.now() + 6000;

function projectList(): Project[] {
	if (cloneFlipsAt && Date.now() > cloneFlipsAt) {
		const project = projects.find((p) => p.id === "p5");
		if (project) project.status = "up";
		cloneFlipsAt = 0;
	}
	return projects;
}

// ── sessions + messages ─────────────────────────────────────────────

type Session = {
	id: string;
	parent_session_id: string;
	title: string;
	message_count: number;
	prompt_tokens: number;
	completion_tokens: number;
	summary_message_id: string;
	cost: number;
	todos: unknown[];
	channel: string;
	created_at: number;
	updated_at: number;
	is_busy: boolean;
	attached_clients: number;
};

function session(id: string, title: string, updated: number): Session {
	return {
		id,
		parent_session_id: "",
		title,
		message_count: 0,
		prompt_tokens: 0,
		completion_tokens: 0,
		summary_message_id: "",
		cost: 0,
		todos: [],
		channel: "",
		created_at: updated - 600,
		updated_at: updated,
		is_busy: false,
		attached_clients: 0,
	};
}

let sessions: Session[] = [
	session("s1", "Build the project picker", now()),
	session("s2", "Tune the CRT theme", now() - 3600),
];

type Part = { type: string; data: unknown };
type Message = {
	id: string;
	role: "assistant" | "user" | "system" | "tool";
	session_id: string;
	parts: Part[];
	model: string;
	provider: string;
	created_at: number;
	updated_at: number;
};

function message(
	id: string,
	role: Message["role"],
	sessionId: string,
	parts: Part[],
	offset: number,
): Message {
	const at = now() - offset;
	return {
		id,
		role,
		session_id: sessionId,
		parts,
		model: "mock-sonnet",
		provider: "mock",
		created_at: at,
		updated_at: at,
	};
}

const sampleMessages: Record<string, Message[]> = {
	s1: [
		message(
			"m1",
			"user",
			"s1",
			[{ type: "text", data: { text: "Add a project picker with status chips." } }],
			300,
		),
		message(
			"m2",
			"assistant",
			"s1",
			[
				{
					type: "text",
					data: {
						text: "I'll wire the **project menu** first, then the shell.\n\n- [x] registry list\n- [ ] add dialog\n- [ ] delete confirm",
					},
				},
				{
					type: "reasoning",
					data: { thinking: "The picker needs per-row states: cloning, error, down and up." },
				},
				{
					type: "tool_call",
					data: {
						id: "tc1",
						name: "read_file",
						input: '{"path":"web/src/App.tsx"}',
						finished: true,
					},
				},
				{
					type: "tool_result",
					data: {
						tool_call_id: "tc1",
						name: "read_file",
						content: "export default function App() {\n  // …\n}",
						metadata: "",
						is_error: false,
					},
				},
				{
					type: "shell_command",
					data: { command: "bun run lint", output: "tsc -b && oxlint .\n✓ clean" },
				},
			],
			250,
		),
		message(
			"m3",
			"user",
			"s1",
			[{ type: "text", data: { text: "Looks good — what's next?" } }],
			120,
		),
		message(
			"m4",
			"assistant",
			"s1",
			[
				{
					type: "text",
					data: { text: "Next: the permission and question cards, then a theme pass." },
				},
			],
			60,
		),
	],
	s2: [
		message(
			"m5",
			"user",
			"s2",
			[{ type: "text", data: { text: "Make the HUD read like a game cabinet." } }],
			7200,
		),
		message(
			"m6",
			"assistant",
			"s2",
			[
				{
					type: "text",
					data: { text: "Done — VT323 for the HUD, mustard accents, scanlines behind the shell." },
				},
			],
			7100,
		),
	],
};

sessions[0].message_count = sampleMessages.s1.length;
sessions[0].cost = 0.42;
sessions[1].message_count = sampleMessages.s2.length;

// ── SSE ─────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
const streams = new Set<ReadableStreamDefaultController<Uint8Array>>();

function frame(type: string, payload: unknown): Uint8Array {
	return encoder.encode(`data: ${JSON.stringify({ type, payload })}\n\n`);
}

function broadcast(type: string, payload: unknown) {
	for (const controller of streams) {
		try {
			controller.enqueue(frame(type, payload));
		} catch {
			streams.delete(controller);
		}
	}
}

const permissionRequest = {
	id: "perm1",
	session_id: "s1",
	tool_call_id: "tc2",
	tool_name: "write_file",
	description: "Create web/src/features/projects/ProjectPicker.tsx",
	action: "write",
	params: { path: "web/src/features/projects/ProjectPicker.tsx", bytes: 4210 },
	path: "web/src/features/projects/ProjectPicker.tsx",
};

const questionRequest = {
	id: "q1",
	session_id: "s1",
	tool_call_id: "tc3",
	questions: [
		{ id: "q1a", type: "yes_no", question: "Keep the current plan?" },
		{
			id: "q1b",
			type: "single_choice",
			question: "Which palette should win?",
			choices: [
				{ id: "gruvbox", label: "Gruvbox" },
				{ id: "solarized", label: "Solarized" },
			],
		},
		{
			id: "q1c",
			type: "multi_choice",
			question: "Include effects?",
			choices: [
				{ id: "crt", label: "CRT scanlines" },
				{ id: "glow", label: "Phosphor glow" },
			],
		},
		{ id: "q1d", type: "free_text", question: "Anything else?" },
	],
	confirm_title: "Mock question batch",
};

function events(): Response {
	let timer: ReturnType<typeof setInterval> | undefined;
	let ref: ReadableStreamDefaultController<Uint8Array> | undefined;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			ref = controller;
			streams.add(controller);
			controller.enqueue(frame("session", sessions[0]));
			setTimeout(() => {
				try {
					controller.enqueue(frame("permission_request", permissionRequest));
				} catch {
					// stream closed
				}
			}, 1500);
			setTimeout(() => {
				try {
					controller.enqueue(frame("question_batch_request", questionRequest));
				} catch {
					// stream closed
				}
			}, 3500);
			timer = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": ping\n\n"));
				} catch {
					// stream closed
				}
			}, 15000);
		},
		cancel() {
			if (ref) streams.delete(ref);
			if (timer) clearInterval(timer);
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

// ── crush surface ───────────────────────────────────────────────────

function replyTo(sessionId: string, prompt: string) {
	const userMessage = message(
		`m-${Date.now()}`,
		"user",
		sessionId,
		[{ type: "text", data: { text: prompt } }],
		0,
	);
	sampleMessages[sessionId] = [...(sampleMessages[sessionId] ?? []), userMessage];

	const target = sessions.find((s) => s.id === sessionId);
	if (target) {
		target.updated_at = now();
		target.message_count += 2;
		target.is_busy = true;
		broadcast("session", target);
	}
	broadcast("agent_event", { type: "response", session_id: sessionId, done: false });
	broadcast("message", userMessage);

	setTimeout(() => {
		const reply = message(
			`m-${Date.now()}`,
			"assistant",
			sessionId,
			[
				{
					type: "text",
					data: {
						text: `Mock reply to **${prompt}**.\n\nThe real agent runs on the server; this is the local preview.`,
					},
				},
				{
					type: "tool_call",
					data: {
						id: `tc-${Date.now()}`,
						name: "read_file",
						input: '{"path":"web/src/App.tsx"}',
						finished: true,
					},
				},
				{
					type: "tool_result",
					data: {
						tool_call_id: `tc-${Date.now()}`,
						name: "read_file",
						content: "export default function App() { /* mock */ }",
						metadata: "",
						is_error: false,
					},
				},
			],
			0,
		);
		sampleMessages[sessionId] = [...(sampleMessages[sessionId] ?? []), reply];
		const done = sessions.find((s) => s.id === sessionId);
		if (done) {
			done.is_busy = false;
			done.updated_at = now();
			done.message_count += 1;
			broadcast("session", done);
		}
		broadcast("message", reply);
		broadcast("run_complete", { session_id: sessionId, message_id: reply.id });
	}, 900);
}

function crush(
	_pid: string,
	_wid: string,
	rest: string,
	method: string,
	req: Request,
): Response | Promise<Response> {
	if (rest === "/sessions" && method === "GET") return json(sessions);
	if (rest === "/sessions" && method === "POST") {
		return body(req).then((input) => {
			const created = session(`s-${Date.now()}`, String(input.title ?? ""), now());
			sessions = [created, ...sessions];
			broadcast("session", created);
			return json(created, 201);
		});
	}

	const messagesMatch = rest.match(/^\/sessions\/([^/]+)\/messages$/);
	if (messagesMatch && method === "GET") {
		return json(sampleMessages[messagesMatch[1]] ?? []);
	}

	const sessionMatch = rest.match(/^\/sessions\/([^/]+)$/);
	if (sessionMatch && method === "DELETE") {
		sessions = sessions.filter((s) => s.id !== sessionMatch[1]);
		delete sampleMessages[sessionMatch[1]];
		return noContent();
	}

	if (rest === "/events") return events();
	if (rest === "/agent" && method === "GET") {
		return json({
			is_busy: false,
			is_ready: true,
			model: { id: "mock-sonnet", name: "Mock Sonnet", provider: "mock" },
			model_cfg: { provider: "mock", model: "mock-sonnet" },
		});
	}
	if (rest === "/agent" && method === "POST") {
		return body(req).then((input) => {
			replyTo(String(input.session_id ?? "s1"), String(input.prompt ?? "hello"));
			return json({ status: "accepted" }, 202);
		});
	}
	if (/^\/agent\/sessions\/[^/]+\/cancel$/.test(rest) && method === "POST") return noContent();
	if (rest === "/agent/main" && method === "POST") return noContent();
	if (rest === "/config" && method === "GET") {
		return json({
			agents: {
				coder: { name: "Coder", description: "Writes code" },
				plan: { name: "Plan", description: "Plans work" },
				task: { name: "Task", description: "Runs tasks" },
			},
			models: { large: { provider: "mock", model: "mock-sonnet" } },
		});
	}
	if (rest === "/config/model" && method === "POST") return noContent();
	if (rest === "/providers" && method === "GET") {
		return json([
			{
				id: "mock",
				name: "Mock",
				models: [
					{ id: "mock-sonnet", name: "Mock Sonnet" },
					{ id: "mock-fast", name: "Mock Fast" },
				],
			},
		]);
	}
	if (rest === "/permissions/skip" && method === "GET") {
		return json({ skip: skipPermissions });
	}
	if (rest === "/permissions/skip" && method === "POST") {
		return body(req).then((input) => {
			skipPermissions = Boolean(input.skip);
			return noContent();
		});
	}
	if (rest === "/permissions/grant" && method === "POST") return json({ resolved: true });
	if (rest === "/questions/answer" && method === "POST") return json({ resolved: true });
	if (rest === "/questions/cancel" && method === "POST") return json({ resolved: true });
	if (rest === "/current-session" && method === "POST") return noContent();

	return json({ message: `no mock route for ${method} ${rest}`, code: "not_found" }, 404);
}

// ── server ──────────────────────────────────────────────────────────

Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;
		const method = req.method;

		if (path === "/api/auth/me") {
			return loggedIn ? json({ user }) : unauthorized();
		}
		if (path === "/api/auth/request-otp" && method === "POST") {
			return json({ message: "If that address can sign in, a code is on its way." });
		}
		if (path === "/api/auth/verify" && method === "POST") {
			const input = await body(req);
			if (String(input.code ?? "") === "000000") {
				return json({ message: "that code is wrong", code: "invalid_code" }, 401);
			}
			loggedIn = true;
			return json({ user }, 200, {
				"Set-Cookie": "vishnu_session=mock; HttpOnly; Path=/; SameSite=Lax",
			});
		}
		if (path === "/api/auth/logout" && method === "POST") {
			loggedIn = false;
			return noContent({
				"Set-Cookie": "vishnu_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
			});
		}

		if (path === "/api/projects" && method === "GET") return json(projectList());
		if (path === "/api/projects" && method === "POST") {
			const input = await body(req);
			const project: Project = {
				id: `p-${Date.now()}`,
				name: String(input.name ?? input.repo_url ?? input.path ?? input.upstream ?? "new-project"),
				mode: input.upstream ? "external" : "managed",
				status: "cloning",
				path: input.path ? String(input.path) : undefined,
				upstream: input.upstream ? String(input.upstream) : undefined,
			};
			projects = [...projects, project];
			setTimeout(() => {
				project.status = "up";
			}, 5000);
			return json({ project }, 202);
		}

		const workspaceMatch = path.match(/^\/api\/projects\/([^/]+)\/workspace$/);
		if (workspaceMatch && method === "GET") {
			const project = projects.find((p) => p.id === workspaceMatch[1]);
			if (!project) return json({ message: "project not found", code: "not_found" }, 404);
			if (project.status === "down") {
				return json({ message: "upstream is not reachable", code: "upstream_down" }, 502);
			}
			if (project.status === "error") {
				return json({ message: project.error ?? "project failed", code: "project_error" }, 409);
			}
			if (project.status === "cloning") {
				return json({ message: "still cloning", code: "cloning" }, 409);
			}
			return json({
				workspace_id: `ws-${project.id}`,
				upstream: `http://127.0.0.1:${project.port ?? 9201}`,
				status: "up",
			});
		}

		const projectMatch = path.match(/^\/api\/projects\/([^/]+)$/);
		if (projectMatch && method === "DELETE") {
			projects = projects.filter((p) => p.id !== projectMatch[1]);
			return noContent();
		}

		const crushMatch = path.match(/^\/p\/([^/]+)\/v1\/workspaces\/([^/]+)(\/.*)?$/);
		if (crushMatch) {
			return crush(crushMatch[1], crushMatch[2], crushMatch[3] ?? "", method, req);
		}

		return json({ message: `no mock route for ${method} ${path}`, code: "not_found" }, 404);
	},
});

console.log(`vishnu mock api → http://127.0.0.1:${PORT}`);
console.log("sign in with any email and code 123456 (000000 = wrong code)");
