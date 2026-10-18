import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const crushUpstream = process.env.VITE_CRUSH_UPSTREAM ?? "http://127.0.0.1:9119";

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
			// Dev-only: forward /v1 straight to `crush server` so the Go
			// proxy isn't needed while iterating on the UI.
			"/v1": {
				target: crushUpstream,
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
