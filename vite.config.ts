import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createLogger, defineConfig, type Plugin } from "vite";
import { readConfig } from "./tools/config.mjs";
import { withPolicy } from "./tools/csp.mjs";
import { devDemo } from "./tools/dev-demo.mjs";

// js/config.js is a classic script on purpose: it stays a separate file so the
// addresses can change after a build. Vite warns that it cannot bundle it.
// A build says nothing unless something is wrong; the dev server has to keep
// printing its address.
function quietLogger(command: "build" | "serve") {
	const logger = createLogger(command === "build" ? "warn" : "info");
	const warn = logger.warn;
	logger.warn = (message, options) => {
		if (message.includes('can\'t be bundled without type="module"')) return;
		warn(message, options);
	};
	return logger;
}

const root = fileURLToPath(new URL("./app", import.meta.url));
const pages = readdirSync(root).filter((name) => name.endsWith(".html"));

/** Writes the content security policy into every built page, from the config. */
function policy(): Plugin {
	return {
		name: "easy-grader-policy",
		apply: "build",
		transformIndexHtml: {
			order: "post",
			handler: (html) => withPolicy(html, readConfig()),
		},
	};
}

export default defineConfig(({ command, mode }) => ({
	customLogger: quietLogger(command),
	root,
	base: "./",
	build: {
		outDir: "../dist",
		emptyOutDir: true,
		rollupOptions: {
			input: Object.fromEntries(
				pages.map((name) => [
					name.replace(/\.html$/, ""),
					fileURLToPath(new URL(`./app/${name}`, import.meta.url)),
				]),
			),
		},
	},
	plugins: [policy(), devDemo(mode)],
}));
