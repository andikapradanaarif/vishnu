import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const apiUpstream = process.env.VITE_API_UPSTREAM ?? "http://127.0.0.1:8080";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,
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
			"/p": {
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
	},
});
