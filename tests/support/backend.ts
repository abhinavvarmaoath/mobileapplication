import { readFile } from "node:fs/promises";
import type { BrowserContext, Route } from "@playwright/test";
import { courses, studentGrades, studentsByCourse } from "./data";

const apiHost = "rubypals.com";
const cdnDir = new URL("../fixtures/cdn/", import.meta.url);

// The pages ask for jQuery 1.8.2 and jQuery Mobile 1.4.0 or 1.4.5; see
// tests/fixtures/cdn/README.md for what is served instead.
const cdnFiles: Array<[RegExp, string, string]> = [
	[/^\/jquery-1\.8\.2\.min\.js$/, "jquery-1.8.2.min.js", "text/javascript"],
	[
		/^\/mobile\/1\.4\.[05]\/jquery\.mobile-1\.4\.[05]\.min\.js$/,
		"jquery.mobile.min.js",
		"text/javascript",
	],
	[
		/^\/mobile\/1\.4\.0\/jquery\.mobile\.structure-1\.4\.0\.min\.css$/,
		"jquery.mobile.structure.min.css",
		"text/css",
	],
];

/** One request a page made to the stubbed API. */
export interface Call {
	method: string;
	endpoint: string;
	query: Record<string, string>;
	form: Record<string, string[]>;
}

export interface Reply {
	status?: number;
	json?: unknown;
	/** Raw body, sent with a JSON content type. */
	text?: string;
	delayMs?: number;
	/** Fail at the network level instead of answering. */
	abort?: boolean;
}

type Handler = Reply | ((call: Call) => Reply);

const ok: Reply = { json: { status: "True" } };

const defaults: Array<[string, Handler]> = [
	["get_course.php", { json: courses }],
	[
		"get_students_by_course.php",
		(call) => ({ json: studentsByCourse[call.query.courseId ?? ""] ?? [] }),
	],
	["login.php", { json: { status: "Student" } }],
	["signup.php", ok],
	["adduser.php", ok],
	["save_marks_setting.php", ok],
	["save_percentage_setting.php", ok],
	["save_grade_setting.php", ok],
	[
		"compute_and_save_grade.php",
		{ json: { grade: "B", percentage: "81", totalMarks: "400" } },
	],
	["computegradestudent.php", { json: { grade: "B", percentage: "81" } }],
	["student.php", { json: studentGrades }],
];

function parseForm(body: string | null): Record<string, string[]> {
	const form: Record<string, string[]> = {};
	for (const [key, value] of new URLSearchParams(body ?? "")) {
		const values = form[key] ?? [];
		values.push(value);
		form[key] = values;
	}
	return form;
}

/**
 * Stands in for everything outside the local server: the CDN, fonts, the PHP
 * API and third-party iframes. Nothing leaves the machine.
 */
export class Backend {
	readonly calls: Call[] = [];
	/** Hostnames contacted, in order of first contact. */
	readonly hosts: string[] = [];
	/** Documents loaded into frames; each is answered with an empty page. */
	readonly frames: string[] = [];
	/** Requests that were refused. */
	readonly blocked: string[] = [];
	private readonly handlers = new Map<string, Handler>(defaults);

	static async attach(context: BrowserContext): Promise<Backend> {
		const backend = new Backend();
		await context.route(
			(url) => url.hostname !== "127.0.0.1",
			(route) => backend.handle(route),
		);
		return backend;
	}

	reply(endpoint: string, handler: Handler): void {
		this.handlers.set(endpoint, handler);
	}

	callsTo(endpoint: string): Call[] {
		return this.calls.filter((call) => call.endpoint === endpoint);
	}

	private async handle(route: Route): Promise<void> {
		const request = route.request();
		const url = new URL(request.url());
		if (!this.hosts.includes(url.hostname)) this.hosts.push(url.hostname);

		if (url.hostname === "code.jquery.com") return this.cdn(route, url);
		if (url.hostname === "fonts.googleapis.com") {
			return route.fulfill({ contentType: "text/css", body: "" });
		}
		if (url.hostname === apiHost) return this.api(route, url);
		if (request.resourceType() === "document") {
			this.frames.push(request.url());
			return route.fulfill({
				contentType: "text/html",
				body: "<!doctype html><title>stub</title>",
			});
		}
		this.blocked.push(request.url());
		return route.abort("blockedbyclient");
	}

	private async cdn(route: Route, url: URL): Promise<void> {
		const match = cdnFiles.find(([pattern]) => pattern.test(url.pathname));
		if (!match) {
			this.blocked.push(url.href);
			return route.abort("blockedbyclient");
		}
		const [, file, contentType] = match;
		return route.fulfill({
			contentType,
			body: await readFile(new URL(file, cdnDir)),
		});
	}

	private async api(route: Route, url: URL): Promise<void> {
		const request = route.request();
		const endpoint = url.pathname.split("/").pop() ?? "";
		const call: Call = {
			method: request.method(),
			endpoint,
			query: Object.fromEntries(url.searchParams),
			form: parseForm(request.postData()),
		};
		this.calls.push(call);

		const handler = this.handlers.get(endpoint);
		if (!handler) {
			this.blocked.push(request.url());
			return route.fulfill({ status: 404, body: "" });
		}
		const reply = typeof handler === "function" ? handler(call) : handler;
		if (reply.delayMs) {
			await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
		}
		if (reply.abort) return route.abort("failed");
		return route.fulfill({
			status: reply.status ?? 200,
			contentType: "application/json",
			headers: { "access-control-allow-origin": "*" },
			body: reply.text ?? JSON.stringify(reply.json ?? {}),
		});
	}
}
