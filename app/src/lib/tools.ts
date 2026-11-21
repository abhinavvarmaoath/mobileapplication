import type { Config } from "../config";
import { h } from "./dom";

/** What an embedded tool may use besides the sandbox's defaults. */
const permissions: Record<string, string> = {
	video: "camera; microphone; fullscreen",
};

function embed(name: string, address: string, label: string): HTMLElement {
	const dialog = h("dialog", { class: "tool-dialog", "aria-label": label });
	const close = h("button", { type: "button", class: "button" }, "Close");
	const open = h(
		"button",
		{ type: "button", class: "button button-primary" },
		label,
	);

	// The frame exists only while the dialog is open, so nothing is requested
	// until the visitor asks, and closing it ends a call.
	open.addEventListener("click", () => {
		const allow = permissions[name];
		const frame = h("iframe", {
			class: "tool-frame",
			title: label,
			sandbox: "allow-forms allow-popups allow-same-origin allow-scripts",
			referrerpolicy: "no-referrer",
			allow,
			src: address,
		});
		dialog.replaceChildren(frame, close);
		dialog.showModal();
	});
	close.addEventListener("click", () => dialog.close());
	dialog.addEventListener("close", () => dialog.replaceChildren());
	return h("div", {}, open, dialog);
}

/**
 * A third-party tool from the config: a link that opens it in a new tab, or,
 * with embedTools, a button that opens it in a sandboxed frame. Nothing when
 * the config has no address for it.
 */
export function toolLink(
	config: Config,
	name: string,
	label: string,
): HTMLElement | null {
	const address = config.tools[name];
	if (!address) return null;
	if (config.embedTools) return embed(name, address, label);
	return h(
		"a",
		{
			class: "button button-primary",
			href: address,
			target: "_blank",
			rel: "noopener noreferrer",
		},
		label,
	);
}
