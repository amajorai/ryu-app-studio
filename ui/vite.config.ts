import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build the App Studio Companion to ONE self-contained HTML document (Path B,
// `ui_format:"html"`). Everything is inlined because the companion CSP blocks
// network loads; `dist/index.html` ships verbatim as the plugin's `ui_code`.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	root: here,
	base: "./",
	plugins: [react(), viteSingleFile()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
		target: "esnext",
		cssCodeSplit: false,
		assetsInlineLimit: Number.POSITIVE_INFINITY,
		modulePreload: { polyfill: false },
		rollupOptions: {
			input: { "app-studio": resolve(here, "index.html") },
			output: { inlineDynamicImports: true },
		},
	},
});
