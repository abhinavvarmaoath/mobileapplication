// Writes the Content-Security-Policy meta tag into every page, built from the
// addresses in app/public/js/config.js. With --check it changes nothing and
// fails when a page is out of date. Run it again after editing the config.
//
// A policy in a meta tag cannot carry frame-ancestors, sandbox or report-uri.
// Those need response headers from the host.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readConfig } from "./config.mjs";

// jQuery Mobile's popup widget writes these two style attributes itself, so
// they are allowed by hash. Every other style comes from a stylesheet.
const popupStyles = ["display: none;", ""];

/** @param {string} text */
function hashOf(text) {
	return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

/** @param {string[]} addresses */
function originsOf(addresses) {
	return [...new Set(addresses.map((address) => new URL(address).origin))];
}

/**
 * @param {Record<string, unknown>} config
 * @param {{ jqueryMobile?: boolean }} [options] jQuery Mobile pages need its
 *   popup styles allowed; pages without it do not.
 */
export function policyFor(config, { jqueryMobile = true } = {}) {
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
		...(jqueryMobile
			? [`style-src-attr 'unsafe-hashes' ${popupStyles.map(hashOf).join(" ")}`]
			: []),
		"img-src 'self' data:",
		["connect-src 'self'", ...backends].join(" "),
		["frame-src", ...(frames.length > 0 ? frames : ["'none'"])].join(" "),
		"base-uri 'self'",
		"form-action 'self'",
	].join("; ");
}

export const metaPattern =
	/<meta http-equiv="Content-Security-Policy" content="[^"]*">/;

/**
 * @param {Record<string, unknown>} config
 * @param {{ jqueryMobile?: boolean }} [options]
 */
export function metaFor(config, options) {
	return `<meta http-equiv="Content-Security-Policy" content="${policyFor(config, options)}">`;
}

/**
 * @param {string} html
 * @param {string} meta
 */
export function withMeta(html, meta) {
	if (metaPattern.test(html)) return html.replace(metaPattern, () => meta);
	const viewport = /^([ \t]*)<meta name="viewport"[^>]*>$/m;
	if (!viewport.test(html)) throw new Error("no viewport meta to put it after");
	return html.replace(viewport, (line, indent) => `${line}\n${indent}${meta}`);
}

/**
 * The page with the policy it needs: only pages that load jQuery Mobile get
 * its popup styles allowed.
 * @param {string} html
 * @param {Record<string, unknown>} config
 */
export function withPolicy(html, config) {
	const jqueryMobile = html.includes("jquery.mobile");
	return withMeta(html, metaFor(config, { jqueryMobile }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const root = new URL("../", import.meta.url);
	const check = process.argv.includes("--check");
	const config = readConfig();
	const pages = (await readdir(root)).filter((name) => name.endsWith(".html"));
	const stale = [];
	for (const page of pages.sort()) {
		const file = new URL(page, root);
		const html = await readFile(file, "utf8");
		const updated = withPolicy(html, config);
		if (updated === html) continue;
		stale.push(page);
		if (!check) await writeFile(file, updated);
	}
	if (check && stale.length > 0) {
		console.error(`Out of date, run npm run csp: ${stale.join(", ")}`);
		process.exit(1);
	}
	console.log(
		check
			? `The policy is current in ${pages.length} pages.`
			: `Wrote the policy to ${stale.length} of ${pages.length} pages.`,
	);
}
