import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["app/src/**/*.test.ts", "tools/**/*.test.ts"],
		environment: "node",
	},
});
