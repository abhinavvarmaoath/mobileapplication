import { h } from "./dom";

/** What shows while something loads. */
export function loading(text: string): HTMLElement {
	return h("p", { role: "status" }, text);
}

/** What shows when something did not load, with a way to try again. */
export function failed(message: string, retry: () => void): HTMLElement {
	const again = h("button", { type: "button", class: "button" }, "Try again");
	again.addEventListener("click", retry);
	return h(
		"div",
		{ class: "stack" },
		h("p", { role: "alert", class: "form-error" }, message),
		again,
	);
}
