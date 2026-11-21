import { readFileSync } from "node:fs";
import { readConfig } from "../../tools/config.mjs";
import { metaPattern, policyFor, withPolicy } from "../../tools/csp.mjs";
import { expect, test } from "../support/app";
import { pages } from "../support/pages";

test("the policy lets pages load only from their own origin and the backend", () => {
	// Written out in full so that loosening it shows up in review.
	expect(policyFor(readConfig())).toBe(
		[
			"default-src 'none'",
			"script-src 'self'",
			"style-src 'self'",
			"style-src-attr 'unsafe-hashes' 'sha256-biLFinpqYMtWHmXfkA1BPeCY0/fNt46SAZ+BBk5YUog=' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
			"img-src 'self' data:",
			"connect-src 'self' https://rubypals.com",
			"frame-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		].join("; "),
	);
});

test("frames are allowed only from the tools, and only when embedding is on", () => {
	const config = readConfig();
	expect(policyFor(config)).toContain("frame-src 'none'");
	expect(policyFor({ ...config, embedTools: true })).toContain(
		"frame-src https://openloop.com https://varmapp.com https://www.hiippoo.com https://www.gruveo.com;",
	);
});

test("pages without jQuery Mobile get a policy that allows no inline style", () => {
	expect(policyFor(readConfig(), { jqueryMobile: false })).toBe(
		[
			"default-src 'none'",
			"script-src 'self'",
			"style-src 'self'",
			"img-src 'self' data:",
			"connect-src 'self' https://rubypals.com",
			"frame-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
		].join("; "),
	);
});

test("every built page carries the policy built from js/config.js", () => {
	const config = readConfig();
	for (const page of pages) {
		const html = readFileSync(
			new URL(`../../dist/${page}`, import.meta.url),
			"utf8",
		);
		expect(html.match(metaPattern), page).not.toBeNull();
		// Putting the right policy in again changes nothing.
		expect(withPolicy(html, config), page).toBe(html);
	}
});

test.describe("the browser enforces it", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("index.html");
	});

	test("no inline script runs and code from a string is refused", async ({
		app,
	}) => {
		// Playwright's own evaluation is exempt from the policy, so the attempts
		// are made later, from the page's event loop, as injected code would be.
		await app.page.evaluate(`
			const script = document.createElement("script");
			script.textContent = "window.ranInline = true";
			document.head.append(script);
			setTimeout(() => {
				try {
					new Function("window.ranEval = true")();
					window.evalResult = "ran";
				} catch (error) {
					window.evalResult = error.name;
				}
			}, 0);
		`);
		await expect
			.poll(() => app.page.evaluate("window.evalResult"))
			.toBe("EvalError");
		expect(await app.page.evaluate('"ranInline" in window')).toBe(false);
		expect(await app.page.evaluate('"ranEval" in window')).toBe(false);
		await expect
			.poll(() => app.cspViolations.join("\n"))
			.toContain("inline script");
		app.takeCspViolations();
	});

	test("an inline style attribute is ignored", async ({ app }) => {
		await app.page.evaluate(() =>
			document.body.setAttribute("style", "display: none"),
		);
		const display = await app.page.evaluate(
			() => getComputedStyle(document.body).display,
		);
		expect(display).not.toBe("none");
		await expect.poll(() => app.cspViolations.length).toBe(1);
		app.takeCspViolations();
	});

	test("frames and requests to other hosts are refused", async ({ app }) => {
		const fetched = await app.page.evaluate(async () => {
			const frame = document.createElement("iframe");
			frame.src = "https://frame.example.test/";
			document.body.append(frame);
			return fetch("https://elsewhere.example.test/").then(
				() => "reached",
				() => "refused",
			);
		});
		expect(fetched).toBe("refused");
		await expect
			.poll(() => app.cspViolations.join("\n"))
			.toContain("frame-src 'none'");
		expect(app.cspViolations.join("\n")).toContain(
			"connect-src 'self' https://rubypals.com",
		);
		app.takeCspViolations();
		expect(app.backend.hosts, "hosts that were contacted").toEqual([]);
	});
});
