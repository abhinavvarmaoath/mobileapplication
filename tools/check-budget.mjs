// Fails when a page in dist/ loads more than the budget, gzipped: its HTML and
// every script, stylesheet and preloaded chunk it names. Run npm run build first.
import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const budgetKb = 50;
const dist = new URL("../dist/", import.meta.url);

const pages = (await readdir(dist).catch(() => []))
	.filter((name) => name.endsWith(".html"))
	.sort();
if (pages.length === 0) {
	console.error("dist/ has no pages: run npm run build first");
	process.exit(1);
}

const named = /(?:src|href)="\.\/([^"]+\.(?:js|css))"/g;
const sizes = [];
for (const page of pages) {
	const html = await readFile(new URL(page, dist));
	const files = new Set([...html.toString().matchAll(named)].map((m) => m[1]));
	let bytes = gzipSync(html).length;
	for (const file of files) {
		bytes += gzipSync(await readFile(new URL(file ?? "", dist))).length;
	}
	sizes.push({ page, kb: bytes / 1024 });
}

const over = sizes.filter(({ kb }) => kb > budgetKb);
for (const { page, kb } of over) {
	console.error(`${page}: ${kb.toFixed(1)} KB gzipped, budget is ${budgetKb}`);
}
if (over.length > 0) process.exit(1);
const largest = sizes.reduce((a, b) => (b.kb > a.kb ? b : a));
console.log(
	`Every page is within ${budgetKb} KB gzipped; the largest is ${largest.page} at ${largest.kb.toFixed(1)} KB.`,
);
