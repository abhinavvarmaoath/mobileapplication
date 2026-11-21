// Assembles dist/, the site that is served and tested: the files in
// app/public, then every old page and its files that have not been replaced.
// The Vite build of app/ joins them once there are pages to build.
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL("app/public/", root), dist, { recursive: true });

const legacy = [
	...(await readdir(root)).filter((name) => name.endsWith(".html")),
	"css",
	"js",
	"themes",
	"vendor",
];
for (const name of legacy) {
	await cp(new URL(name, root), new URL(name, dist), {
		recursive: true,
		force: false,
	});
}
console.log(`Assembled ${fileURLToPath(dist)}`);
