// Builds the Content-Security-Policy meta tag from the config. The Vite build
// puts it in every page. After editing the config in a built site, run
// node tools/csp.mjs [dir] to write it into the pages in dir again; dir is dist
// by default.
//
// A policy in a meta tag cannot carry frame-ancestors, sandbox or report-uri.
// Those need response headers from the host.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readConfig } from "./config.mjs";

/** @param {string[]} addresses */
function originsOf(addresses) {
	return [...new Set(addresses.map((address) => new URL(address).origin))];
}

/** @param {Record<string, unknown>} config */
export function policyFor(config) {
	// A demo answers every request itself, so it needs no backend origin.
	const backends = config.demo
		? []
		: originsOf([String(config.apiBase), String(config.lookupBase)]);
	const tools = /** @type {Record<string, string>} */ (config.tools ?? {});
	const frames = config.embedTools
		? originsOf(Object.values(tools).filter(Boolean))
		: [];
	return [
		"default-src 'none'",
		"script-src 'self'",
		"style-src 'self'",
		"img-src 'self'",
		["connect-src 'self'", ...backends].join(" "),
		["frame-src", ...(frames.length > 0 ? frames : ["'none'"])].join(" "),
		"base-uri 'self'",
		"form-action 'self'",
	].join("; ");
}

export const metaPattern =
	/<meta http-equiv="Content-Security-Policy" content="[^"]*">/;

/** @param {Record<string, unknown>} config */
export function metaFor(config) {
	return `<meta http-equiv="Content-Security-Policy" content="${policyFor(config)}">`;
}

/**
 * The page with the policy for this config in it, whether or not it had one.
 * @param {string} html
 * @param {Record<string, unknown>} config
 */
export function withPolicy(html, config) {
	const meta = metaFor(config);
	if (metaPattern.test(html)) return html.replace(metaPattern, () => meta);
	const viewport = /^([ \t]*)<meta name="viewport"[^>]*>$/m;
	if (!viewport.test(html)) throw new Error("no viewport meta to put it after");
	return html.replace(viewport, (line, indent) => `${line}\n${indent}${meta}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const dir = resolve(
		process.argv[2] ?? fileURLToPath(new URL("../dist", import.meta.url)),
	);
	const config = readConfig(join(dir, "js", "config.js"));
	const pages = (await readdir(dir)).filter((name) => name.endsWith(".html"));
	for (const page of pages) {
		const file = join(dir, page);
		await writeFile(file, withPolicy(await readFile(file, "utf8"), config));
	}
	console.log(`Wrote the policy to ${pages.length} pages in ${dir}`);
}
