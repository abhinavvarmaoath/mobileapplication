export {};

declare global {
	interface Window {
		/** Set by js/config.js, a separate script so it can change after a build. */
		EasyGrader?: unknown;
	}
}
