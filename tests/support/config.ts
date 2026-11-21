import type { Page } from "@playwright/test";
import { readConfig } from "../../tools/config.mjs";

/** Serves js/config.js to this page with some settings replaced. */
export async function useConfig(
	page: Page,
	overrides: Record<string, unknown>,
): Promise<void> {
	const config = { ...readConfig(), ...overrides };
	await page.route("**/js/config.js", (route) =>
		route.fulfill({
			contentType: "text/javascript",
			body: `window.EasyGrader = ${JSON.stringify(config)};`,
		}),
	);
}
