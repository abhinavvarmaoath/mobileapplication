import { h } from "./dom";
import { describeFailure } from "./failure";

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

interface LoadOptions<T> {
	/** Gets aria-busy while loading. */
	busy: HTMLElement;
	/** What the loading state, the result or the failure is drawn into. */
	region: HTMLElement;
	loadingText: string;
	/** Said first when the load fails; the reason follows. */
	failureText: string;
	load(): Promise<T>;
	show(value: T): Node;
}

/** Loads something, shows it, or says why not and offers to try again. */
export async function loadInto<T>(options: LoadOptions<T>): Promise<void> {
	const { busy, region, loadingText, failureText, load, show } = options;
	async function run(): Promise<void> {
		busy.setAttribute("aria-busy", "true");
		region.replaceChildren(loading(loadingText));
		try {
			region.replaceChildren(show(await load()));
		} catch (error) {
			region.replaceChildren(
				failed(`${failureText} ${describeFailure(error)}`, run),
			);
		} finally {
			busy.removeAttribute("aria-busy");
		}
	}
	await run();
}
