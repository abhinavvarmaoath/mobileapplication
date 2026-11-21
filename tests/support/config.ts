import type { Page } from "@playwright/test";
import { readConfig } from "../../tools/config.mjs";

type Settings = Record<string, unknown>;

function isSettings(value: unknown): value is Settings {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Serves js/config.js to this page with some settings replaced. Groups such as
 * `tools` are merged, so one entry can change and the rest stay.
 */
export async function useConfig(
	page: Page,
	overrides: Settings,
): Promise<void> {
	const config: Settings = { ...readConfig() };
	for (const [key, value] of Object.entries(overrides)) {
		const current = config[key];
		config[key] =
			isSettings(current) && isSettings(value)
				? { ...current, ...value }
				: value;
	}
	await page.route("**/js/config.js", (route) =>
		route.fulfill({
			contentType: "text/javascript",
			body: `window.EasyGrader = ${JSON.stringify(config)};`,
		}),
	);
}
