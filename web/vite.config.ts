import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const reactPath = fileURLToPath(new URL("./node_modules/react", import.meta.url));
const reactDomPath = fileURLToPath(new URL("./node_modules/react-dom", import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	// Dev-server proxy target for /api + /p — shell env wins, then web/.env
	// (vite only loads .env into process.env after config evaluation, so
	// loadEnv is needed to see it here), then the local api default.
	// `||` not `??`: an empty `VITE_API_UPSTREAM=` line must fall through.
	const apiUpstream =
		process.env.VITE_API_UPSTREAM ||
		loadEnv(mode, process.cwd(), "").VITE_API_UPSTREAM ||
		"http://127.0.0.1:8080";
	return {
		plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
		resolve: {
			// shared-ui is a workspace package with its own node_modules; without
			// dedupe its dist can resolve a second React/ReactDOM copy, which
			// breaks createPortal (dialogs, drawers, popovers, tooltips).
			dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
			alias: {
				"@": new URL("./src", import.meta.url).pathname,
				// The workspace package ships prebuilt dist files; pin their
				// react/react-dom imports to the app copies so createPortal is
				// created by the same renderer that renders the app.
				react: reactPath,
				"react-dom": reactDomPath,
				"react/jsx-runtime": `${reactPath}/jsx-runtime.js`,
				"react/jsx-dev-runtime": `${reactPath}/jsx-dev-runtime.js`,
			},
		},
		server: {
			host: true,
			port: 5173,
			proxy: {
				// Dev-only: the SPA and the API share an origin in production.
				// Both the control plane and the per-project crush proxy pass
				// through here so cookies and SSE behave the same way.
				"/api": {
					target: apiUpstream,
					changeOrigin: true,
				},
				"/p/": {
					target: apiUpstream,
					changeOrigin: true,
				},
			},
		},
		build: {
			outDir: "dist",
			assetsDir: "assets",
			emptyOutDir: true,
			sourcemap: false,
			target: "es2022",
			// The single local SPA bundle is ~590 kB before gzip; the default
			// 500 kB warning is noise for this app.
			chunkSizeWarningLimit: 800,
		},
	};
});
