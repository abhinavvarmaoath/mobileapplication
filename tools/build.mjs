// Assembles dist/, the site that is served and tested: the files in
// app/public, the Vite build of the pages in app/, then every old page and its
// files that have not been replaced.
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL("app/public/", root), dist, { recursive: true });

const rebuilt = (await readdir(new URL("app/", root))).filter((name) =>
	name.endsWith(".html"),
);
if (rebuilt.length > 0) {
	await build({
		configFile: fileURLToPath(new URL("vite.config.ts", root)),
		logLevel: "warn",
	});
}

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
