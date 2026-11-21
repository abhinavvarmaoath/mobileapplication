import { type Api, createClient } from "../api";
import { type Config, parseConfig } from "../config";
import { h } from "./dom";

export interface Context {
	config: Config;
	api: Api;
	/** The element the page draws into. */
	root: HTMLElement;
}

async function demoTransport() {
	// Loaded only in demo mode, so other builds do not carry it.
	const { createDemoTransport, createSessionStore } = await import(
		"../demo/backend"
	);
	return createDemoTransport(createSessionStore(sessionStorage));
}

/**
 * Starts a page: reads the config, builds the API client, runs the page, and
 * then marks the document ready, which the tests wait for.
 */
export async function boot(
	run: (context: Context) => void | Promise<void>,
): Promise<void> {
	const root = document.getElementById("app");
	if (!root) throw new Error("The page has no #app element");
	try {
		const config = parseConfig(window.EasyGrader);
		const transport = config.demo ? await demoTransport() : undefined;
		await run({ config, api: createClient({ ...config, transport }), root });
	} catch (error) {
		console.error(error);
		root.replaceChildren(
			h(
				"main",
				{ class: "page" },
				h("h1", {}, "Easy Grader"),
				h(
					"p",
					{ role: "alert" },
					"This page could not start. Reload it, or try again later.",
				),
			),
		);
	} finally {
		document.documentElement.dataset.ready = "true";
	}
}
