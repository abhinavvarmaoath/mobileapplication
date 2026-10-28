import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORT ?? 5173);
// Only needed where Playwright's own browser download is not available.
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
	testDir: "tests/e2e",
	fullyParallel: true,
	// Recording baselines rewrites a shared file, so do it one test at a time.
	workers: process.env.UPDATE_BASELINES ? 1 : undefined,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		viewport: { width: 390, height: 844 },
		launchOptions: executablePath ? { executablePath } : {},
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { browserName: "chromium" } }],
	webServer: {
		command: "node tools/serve.mjs",
		url: `http://127.0.0.1:${port}/`,
		env: { PORT: String(port) },
		reuseExistingServer: !process.env.CI,
	},
});
