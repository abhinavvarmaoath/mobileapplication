// Fails when a file in vendor/ no longer matches vendor/SHA256SUMS, or a
// script or stylesheet there is missing from it.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

const dir = new URL("../vendor/", import.meta.url);
const manifest = await readFile(new URL("SHA256SUMS", dir), "utf8");

/** @type {Map<string, string>} */
const expected = new Map();
for (const line of manifest.trim().split("\n")) {
	const [hash = "", name = ""] = line.split(/\s+/);
	expected.set(name, hash);
}

let failed = false;
for (const [name, hash] of expected) {
	const bytes = await readFile(new URL(name, dir));
	if (createHash("sha256").update(bytes).digest("hex") !== hash) {
		failed = true;
		console.error(`${name}: does not match vendor/SHA256SUMS`);
	}
}
for (const name of await readdir(dir)) {
	if (/\.(css|js)$/.test(name) && !expected.has(name)) {
		failed = true;
		console.error(`${name}: not listed in vendor/SHA256SUMS`);
	}
}
if (failed) process.exit(1);
console.log(`${expected.size} vendored files match vendor/SHA256SUMS.`);
