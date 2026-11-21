import { readFileSync } from "node:fs";
import { readConfig } from "../../tools/config.mjs";
import { metaFor, metaPattern, policyFor } from "../../tools/csp.mjs";
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

test("every page carries the policy built from js/config.js", () => {
	const meta = metaFor(readConfig());
	for (const page of pages) {
		const html = readFileSync(
			new URL(`../../${page}`, import.meta.url),
			"utf8",
		);
		expect(html.match(metaPattern)?.[0], page).toBe(meta);
	}
});

test.describe("the browser enforces it", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("index.html");
	});

	test("no inline script runs and eval is refused", async ({ app }) => {
		// Playwright's own evaluation is exempt from the policy, so the attempts
		// are made later, from the page's event loop, as injected code would be.
		await app.page.evaluate(`
			const script = document.createElement("script");
			script.textContent = "window.ranInline = true";
			document.head.append(script);
			setTimeout(() => {
				try {
					jQuery.globalEval("window.ranEval = true");
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
