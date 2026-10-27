// Dev-only playground server (issue #435).
//
// Builds the Tailwind stylesheet once (so `/output.css` is ready on first
// load), keeps it fresh in watch mode, and serves playground/index.html —
// bundled by Bun, which transpiles main.tsx and its imports on the fly.
//
//   bun run playground          → http://localhost:5173
//   PORT=4000 bun run playground
//
// Nothing here ships in `dist/`; the playground is excluded from the published
// package via package.json#files.
import index from "../playground/index.html";

const port = Number(process.env.PORT ?? 5173);
// Spawn via the running Bun binary — `bunx` isn't guaranteed on PATH.
const tailwindArgs = [process.execPath, "x", "@tailwindcss/cli", "-i", "playground/index.css", "-o", "playground/output.css"];

// Initial build so the stylesheet exists before the first request.
const initialCss = Bun.spawnSync(tailwindArgs, {stdio: ["ignore", "inherit", "inherit"]});
if (initialCss.exitCode !== 0) {
	console.error("Tailwind build failed — run `bun install` in shared-ui/ and retry.");
	process.exit(initialCss.exitCode);
}

const server = Bun.serve({
	hostname: "127.0.0.1",
	port,
	development: true,
	routes: {
		"/": index,
		"/output.css": () =>
			new Response(Bun.file("playground/output.css"), {headers: {"content-type": "text/css; charset=utf-8"}}),
	},
});

// Rebuild on change — spawned after Bun.serve so a failed bind can't orphan it.
const tailwind = Bun.spawn([...tailwindArgs, "--watch"], {stdio: ["ignore", "inherit", "inherit"]});

console.log(`\n▶ Nexus UI playground → ${server.url}\n`);

function shutdown() {
	tailwind.kill();
	server.stop(true);
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
