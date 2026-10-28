// Serves the repository root the way a static host would. Used for local
// work and by the Playwright tests.
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT ?? 5173);

const types = {
	".css": "text/css; charset=utf-8",
	".gif": "image/gif",
	".html": "text/html; charset=utf-8",
	".jpg": "image/jpeg",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
};

/**
 * Maps a request path to a file inside the root, or null when the path
 * escapes the root or points at a dotfile or node_modules.
 * @param {string} urlPath
 */
function resolveFile(urlPath) {
	const file = resolve(join(root, decodeURIComponent(urlPath)));
	if (file !== root && !file.startsWith(root + sep)) return null;
	const parts = file.slice(root.length).split(sep);
	const hidden = parts.some((p) => p.startsWith(".") || p === "node_modules");
	return hidden ? null : file;
}

const server = createServer(async (req, res) => {
	try {
		const { pathname } = new URL(req.url ?? "/", "http://localhost");
		let file = resolveFile(pathname);
		if (!file) {
			res.writeHead(403).end("Forbidden");
			return;
		}
		if ((await stat(file)).isDirectory()) file = join(file, "index.html");
		const body = await readFile(file);
		res.writeHead(200, {
			"Cache-Control": "no-store",
			"Content-Type": types[extname(file)] ?? "application/octet-stream",
		});
		res.end(body);
	} catch (error) {
		const missing =
			error instanceof Error && "code" in error && error.code === "ENOENT";
		res.writeHead(missing ? 404 : 400);
		res.end(missing ? "Not found" : "Bad request");
	}
});

server.listen(port, "127.0.0.1", () => {
	console.log(`Serving ${root} at http://127.0.0.1:${port}/`);
});
