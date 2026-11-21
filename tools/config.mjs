// Reads app/public/js/config.js without a browser. The file assigns window.EasyGrader, so
// it is run against a stand-in window.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

/**
 * @param {URL | string} [file]
 * @returns {Record<string, unknown>}
 */
export function readConfig(
	file = new URL("../app/public/js/config.js", import.meta.url),
) {
	/** @type {{ EasyGrader?: Record<string, unknown> }} */
	const window = {};
	runInNewContext(readFileSync(file, "utf8"), { window });
	if (!window.EasyGrader) {
		throw new Error(`${file} does not set window.EasyGrader`);
	}
	return window.EasyGrader;
}
