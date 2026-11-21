import { test as base, expect, type Page } from "@playwright/test";
import { Backend } from "./backend";

/** A page under test plus everything it printed, alerted or asked for. */
export class App {
	readonly consoleErrors: string[] = [];
	readonly consoleLogs: string[] = [];
	readonly pageErrors: string[] = [];
	/** Messages the browser printed about the page's own policy. */
	readonly cspViolations: string[] = [];
	readonly dialogs: string[] = [];

	constructor(
		readonly page: Page,
		readonly backend: Backend,
	) {
		page.on("console", (message) => {
			if (message.type() === "error") this.consoleErrors.push(message.text());
			if (message.type() === "log") this.consoleLogs.push(message.text());
			if (/Content Security Policy/i.test(message.text())) {
				this.cspViolations.push(message.text());
			}
		});
		page.on("pageerror", (error) => this.pageErrors.push(error.message));
		page.on("dialog", async (dialog) => {
			this.dialogs.push(dialog.message());
			await dialog.dismiss();
		});
	}

	/** Returns the policy violations so far and forgets them. */
	takeCspViolations(): string[] {
		return this.cspViolations.splice(0);
	}

	async open(path: string): Promise<void> {
		await this.page.goto(`/${path}`);
		// An old page is ready when jQuery Mobile has made its first page
		// active. A new page says so itself.
		await this.page
			.locator(".ui-page-active, html[data-ready]")
			.first()
			.waitFor({ state: "attached" });
	}

	/**
	 * Waits until nothing is in flight: no jQuery request on an old page, and
	 * no element marked aria-busy on a new one.
	 */
	async idle(): Promise<void> {
		await this.page.waitForFunction(() => {
			const { jQuery } = window as unknown as { jQuery?: { active: number } };
			const quiet = !jQuery || jQuery.active === 0;
			return quiet && !document.querySelector('[aria-busy="true"]');
		});
	}
}

export const test = base.extend<{ app: App }>({
	app: async ({ page, context }, use) => {
		const app = new App(page, await Backend.attach(context));
		await use(app);
		// Leftover debug output would show up here in every spec.
		expect(app.consoleLogs, "the page wrote to the console").toEqual([]);
		expect(
			app.cspViolations,
			"the page broke its own content security policy",
		).toEqual([]);
		expect(
			app.backend.insecure,
			"the page made a request without HTTPS",
		).toEqual([]);
	},
});

export { expect };
