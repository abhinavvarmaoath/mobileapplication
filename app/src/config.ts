import { isRecord } from "./api/guards";

/** The settings in app/public/js/config.js, checked. */
export interface Config {
	/** The pages never call the backend; an in-browser stand-in answers. */
	demo: boolean;
	/** Open third-party tools in a sandboxed frame instead of a new tab. */
	embedTools: boolean;
	/** Everything except the two lookups. Ends with a slash. */
	apiBase: string;
	/** get_course.php and get_students_by_course.php. Ends with a slash. */
	lookupBase: string;
	/** Third-party tool addresses by name; an empty one is left out. */
	tools: Record<string, string>;
}

function address(raw: Record<string, unknown>, key: string): string {
	const value = raw[key];
	if (typeof value !== "string") throw new Error(`The config needs a ${key}`);
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`The config's ${key} is not an address: ${value}`);
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error(`The config's ${key} must be an http or https address`);
	}
	return value.endsWith("/") ? value : `${value}/`;
}

function toolAddresses(raw: unknown): Record<string, string> {
	if (raw === undefined) return {};
	if (!isRecord(raw)) throw new Error("The config's tools must be a list");
	const tools: Record<string, string> = {};
	for (const [name, value] of Object.entries(raw)) {
		if (typeof value !== "string") {
			throw new Error(`The config's tool ${name} must be text`);
		}
		tools[name] = value;
	}
	return tools;
}

/** Throws, naming the first problem, when the settings cannot be used. */
export function parseConfig(raw: unknown): Config {
	if (!isRecord(raw))
		throw new Error("The config did not set window.EasyGrader");
	return {
		demo: raw.demo === true,
		embedTools: raw.embedTools === true,
		apiBase: address(raw, "apiBase"),
		lookupBase: address(raw, "lookupBase"),
		tools: toolAddresses(raw.tools),
	};
}
