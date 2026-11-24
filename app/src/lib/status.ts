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

/** Puts focus on the first thing in the region that can take it. */
function focusFirstIn(region: HTMLElement): void {
	const first = region.querySelector<HTMLElement>(
		"a[href], button, input, select, textarea, summary",
	);
	if (first) {
		first.focus();
		return;
	}
	// Nothing to press: the region takes focus and the next Tab leaves from it.
	region.tabIndex = -1;
	region.focus();
}

/** Loads something, shows it, or says why not and offers to try again. */
export async function loadInto<T>(options: LoadOptions<T>): Promise<void> {
	const { busy, region, loadingText, failureText, load, show } = options;
	async function run(): Promise<void> {
		// Pressing Try again removes the button that has focus, which would send
		// focus back to the top of the page.
		const hadFocus = region.contains(document.activeElement);
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
		// Unless the visitor has moved on while it loaded.
		const lost =
			document.activeElement === document.body ||
			region.contains(document.activeElement);
		if (hadFocus && lost) focusFirstIn(region);
	}
	await run();
}
