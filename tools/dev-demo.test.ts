import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { runInNewContext } from "node:vm";
import { createLogger, createServer, type ViteDevServer } from "vite";
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.mjs";
import { devDemo } from "./dev-demo.mjs";

const configFile = fileURLToPath(new URL("../vite.config.ts", import.meta.url));

/** Runs the real dev server in a mode. `banner` prints its address and returns the text. */
async function inMode(
	mode: string,
	use: (server: ViteDevServer, banner: () => string) => Promise<void>,
): Promise<void> {
	const printed: string[] = [];
	const server = await createServer({
		configFile,
		mode,
		customLogger: {
			...createLogger("silent"),
			info: (message) => {
				printed.push(message);
			},
		},
		server: { host: "127.0.0.1", port: 0 },
	});
	await server.listen();
	const banner = () => {
		printed.length = 0;
		server.printUrls();
		return stripVTControlCharacters(printed.join("\n"));
	};
	try {
		await use(server, banner);
	} finally {
		await server.close();
	}
}

async function servedConfig(
	server: ViteDevServer,
): Promise<Record<string, unknown>> {
	const response = await fetch(`${server.resolvedUrls?.local[0]}js/config.js`);
	const window: { EasyGrader?: Record<string, unknown> } = {};
	runInNewContext(await response.text(), { window });
	return window.EasyGrader ?? {};
}

describe("the dev server", () => {
	it("answers itself: the config is served with demo on, and nothing else changed", async () => {
		await inMode("development", async (server, banner) => {
			expect(await servedConfig(server)).toEqual({
				...readConfig(),
				demo: true,
			});
			expect(banner()).toContain("Backend: demo");
		});
	});

	it("serves the config as written in live mode", async () => {
		await inMode("live", async (server, banner) => {
			expect(await servedConfig(server)).toEqual(readConfig());
			expect(banner()).toContain("Backend: live");
		});
	});

	it("still prints its address", async () => {
		for (const mode of ["development", "live"]) {
			await inMode(mode, async (server, banner) => {
				expect(banner(), mode).toContain(server.resolvedUrls?.local[0] ?? "");
			});
		}
	});

	it("leaves builds alone", () => {
		expect(devDemo("production").apply).toBe("serve");
	});
});
