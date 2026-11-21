// Copies the app into a new directory with demo mode switched on, for hosting
// that has no backend, such as GitHub Pages. The pages get the policy that
// goes with the demo config.
// Usage: node tools/build-demo.mjs <empty directory>
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readConfig } from "./config.mjs";
import { metaFor, withMeta } from "./csp.mjs";

const [argument] = process.argv.slice(2);
if (!argument) {
	console.error("Usage: node tools/build-demo.mjs <empty directory>");
	process.exit(1);
}
const target = resolve(argument);
await mkdir(target, { recursive: true });
if ((await readdir(target)).length > 0) {
	console.error(`${target} is not empty`);
	process.exit(1);
}

const root = new URL("../", import.meta.url);
const config = { ...readConfig(), demo: true };

for (const folder of ["css", "js", "themes", "vendor"]) {
	await cp(new URL(folder, root), join(target, folder), { recursive: true });
}
await writeFile(
	join(target, "js", "config.js"),
	`window.EasyGrader = ${JSON.stringify(config, null, "\t")};\n`,
);
const pages = (await readdir(root)).filter((name) => name.endsWith(".html"));
for (const page of pages) {
	const html = await readFile(new URL(page, root), "utf8");
	await writeFile(join(target, page), withMeta(html, metaFor(config)));
}
console.log(`Wrote the demo, ${pages.length} pages, to ${target}`);
