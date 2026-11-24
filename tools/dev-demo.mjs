// In development the app answers itself, so nobody needs the backend to work on
// it: the config is served with demo mode switched on. Started in live mode
// (npm run dev:live) the config is served as written, and the app calls the
// backend it names. Builds are not touched.
import { readConfig } from "./config.mjs";

/**
 * @param {string} mode The mode Vite was started in.
 * @returns {import("vite").Plugin}
 */
export function devDemo(mode) {
	const live = mode === "live";
	return {
		name: "easy-grader-dev-demo",
		apply: "serve",
		configureServer(server) {
			// Printed under the address, where it gets read.
			const { logger } = server.config;
			const printUrls = server.printUrls.bind(server);
			server.printUrls = () => {
				printUrls();
				logger.info(
					live
						? "  Backend: live, as named in app/public/js/config.js"
						: "  Backend: demo, the app answers itself (npm run dev:live for the real one)",
				);
			};
			if (live) return;
			server.middlewares.use("/js/config.js", (_request, response) => {
				const config = { ...readConfig(), demo: true };
				response.setHeader("Content-Type", "text/javascript");
				response.setHeader("Cache-Control", "no-store");
				response.end(`window.EasyGrader = ${JSON.stringify(config)};\n`);
			});
		},
	};
}
