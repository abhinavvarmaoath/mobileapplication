import { test as base, expect, type Page } from "@playwright/test";
import { Backend } from "./backend";

/** A page under test plus everything it printed, alerted or asked for. */
export class App {
	readonly consoleErrors: string[] = [];
	readonly consoleLogs: string[] = [];
	readonly pageErrors: string[] = [];
	readonly dialogs: string[] = [];

	constructor(
		readonly page: Page,
		readonly backend: Backend,
	) {
		page.on("console", (message) => {
			if (message.type() === "error") this.consoleErrors.push(message.text());
			if (message.type() === "log") this.consoleLogs.push(message.text());
		});
		page.on("pageerror", (error) => this.pageErrors.push(error.message));
		page.on("dialog", async (dialog) => {
			this.dialogs.push(dialog.message());
			await dialog.dismiss();
		});
	}

	async open(path: string): Promise<void> {
		await this.page.goto(`/${path}`);
		await this.page.locator(".ui-page-active").waitFor();
	}
}

export const test = base.extend<{ app: App }>({
	app: async ({ page, context }, use) => {
		await use(new App(page, await Backend.attach(context)));
	},
});

export { expect };
