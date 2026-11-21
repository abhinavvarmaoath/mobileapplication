import { describe, expect, it } from "vitest";
import { parseConfig } from "./config";

const good = {
	demo: false,
	embedTools: false,
	apiBase: "https://api.test/v1/",
	lookupBase: "https://lookup.test/",
	tools: { chat: "https://chat.test/room", video: "" },
};

describe("parseConfig", () => {
	it("reads the settings", () => {
		expect(parseConfig(good)).toEqual(good);
	});

	it("adds the slash an address needs before an endpoint name", () => {
		const config = parseConfig({ ...good, apiBase: "https://api.test/v1" });
		expect(config.apiBase).toBe("https://api.test/v1/");
	});

	it("turns the switches on only for true", () => {
		expect(parseConfig({ ...good, demo: "yes", embedTools: 1 })).toMatchObject({
			demo: false,
			embedTools: false,
		});
		expect(
			parseConfig({ ...good, demo: true, embedTools: true }),
		).toMatchObject({
			demo: true,
			embedTools: true,
		});
	});

	it("allows the tools to be left out", () => {
		const { tools: _tools, ...without } = good;
		expect(parseConfig(without).tools).toEqual({});
	});

	it.each([
		["nothing at all", undefined],
		["a list", []],
		["no apiBase", { ...good, apiBase: undefined }],
		["an apiBase that is not an address", { ...good, apiBase: "rubypals" }],
		[
			"an address that is not http or https",
			{ ...good, lookupBase: "ftp://x.test/" },
		],
		["tools that are not a list", { ...good, tools: "chat" }],
		["a tool that is not text", { ...good, tools: { chat: 1 } }],
	])("refuses %s", (_why, raw) => {
		expect(() => parseConfig(raw)).toThrow();
	});

	it("names the setting that is wrong", () => {
		expect(() => parseConfig({ ...good, lookupBase: "nope" })).toThrow(
			/lookupBase/,
		);
	});
});
