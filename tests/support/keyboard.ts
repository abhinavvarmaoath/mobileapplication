import type { Page } from "@playwright/test";

/** What the page reports about the element that has keyboard focus. */
export interface Stop {
	/** The element and its text, for failure messages. */
	label: string;
	/** Its place among the controls Tab reaches, in document order; -1 if none. */
	index: number;
	/** How many controls Tab reaches on the page. */
	count: number;
	/** The focus indicator, measured where it is drawn. */
	ring: {
		drawn: boolean;
		width: number;
		/** Against what it is drawn on, as WCAG measures it. */
		contrast: number;
		/** Cut off by the edge of the window or by a container that clips. */
		clipped: boolean;
	};
	/** At least partly behind the tab bar fixed to the bottom of the window. */
	covered: boolean;
	/** All of it inside the window. */
	onScreen: boolean;
}

/**
 * Runs in the page, so it uses nothing from this file. Chromium reaches a
 * radio group once, at the chosen button, and a radio button is drawn by its
 * label, so both are allowed for.
 */
export function describeFocus(): Stop {
	const active = document.activeElement;
	const isRadio = (element: Element | null): element is HTMLInputElement =>
		element instanceof HTMLInputElement && element.type === "radio";

	const stops: Element[] = [];
	const candidates = document.querySelectorAll<HTMLElement>(
		"a[href], button, input, select, textarea, summary, [tabindex]",
	);
	for (const element of candidates) {
		if (element.tabIndex < 0) continue;
		if ((element as HTMLButtonElement).disabled) continue;
		if (element.getClientRects().length === 0) continue;
		if (getComputedStyle(element).visibility !== "visible") continue;
		if (isRadio(element)) {
			const group = [
				...document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
			].filter(
				(radio) => radio.name === element.name && radio.form === element.form,
			);
			const reached = group.find((radio) => radio.checked) ?? group[0];
			if (element !== reached) continue;
		}
		stops.push(element);
	}
	const sameStop = (stop: Element) =>
		stop === active ||
		(isRadio(stop) &&
			isRadio(active) &&
			stop.name === active.name &&
			stop.form === active.form);
	const index = stops.findIndex(sameStop);
	const count = stops.length;

	if (!active || active === document.body) {
		const noRing = { drawn: false, width: 0, contrast: 0, clipped: false };
		return {
			label: "body",
			index,
			count,
			ring: noRing,
			covered: false,
			onScreen: true,
		};
	}

	const drawnBy =
		active instanceof HTMLInputElement &&
		getComputedStyle(active).opacity === "0"
			? (active.labels?.[0] ?? active)
			: active;
	const style = getComputedStyle(drawnBy);
	const width = parseFloat(style.outlineWidth);
	const offset = parseFloat(style.outlineOffset);

	const channels = (color: string) =>
		(color.match(/[\d.]+/g) ?? []).map(Number);
	const luminance = (color: number[]) => {
		const [r = 0, g = 0, b = 0] = color.slice(0, 3).map((value) => {
			const s = value / 255;
			return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	// A ring drawn inside the element sits on its own background; one drawn
	// outside sits on whatever is behind the element.
	let behind: Element | null = offset < 0 ? drawnBy : drawnBy.parentElement;
	let background = [255, 255, 255];
	for (; behind; behind = behind.parentElement) {
		const color = channels(getComputedStyle(behind).backgroundColor);
		if (color.length === 3 || color[3] === 1) {
			background = color;
			break;
		}
	}
	const ringLuminance = luminance(channels(style.outlineColor));
	const backgroundLuminance = luminance(background);
	const contrast =
		(Math.max(ringLuminance, backgroundLuminance) + 0.05) /
		(Math.min(ringLuminance, backgroundLuminance) + 0.05);

	const box = drawnBy.getBoundingClientRect();
	const reach = Math.max(0, offset + width);
	const outer = {
		left: box.left - reach,
		right: box.right + reach,
		top: box.top - reach,
		bottom: box.bottom + reach,
	};
	const tolerance = 0.5;
	const outside = (edge: DOMRect) =>
		outer.left < edge.left - tolerance ||
		outer.right > edge.right + tolerance ||
		outer.top < edge.top - tolerance ||
		outer.bottom > edge.bottom + tolerance;
	let clipped = outer.left < -tolerance;
	clipped ||= outer.right > document.documentElement.clientWidth + tolerance;
	let fixed = false;
	for (let node: Element | null = drawnBy; node; node = node.parentElement) {
		const around = getComputedStyle(node);
		if (around.position === "fixed") fixed = true;
		const scrolls =
			around.overflowX !== "visible" || around.overflowY !== "visible";
		const isPage = node === document.documentElement || node === document.body;
		if (node !== drawnBy && scrolls && !isPage) {
			clipped ||= outside(node.getBoundingClientRect());
		}
	}
	// Scrolling cannot bring the bottom of something fixed into view.
	if (fixed) clipped ||= outer.bottom > window.innerHeight + tolerance;

	const bar = document.querySelector("nav.tabs");
	let covered = false;
	if (
		bar &&
		getComputedStyle(bar).position === "fixed" &&
		!bar.contains(active)
	) {
		const edge = bar.getBoundingClientRect();
		covered =
			box.left < edge.right &&
			box.right > edge.left &&
			box.top < edge.bottom &&
			box.bottom > edge.top;
	}

	const name =
		active.getAttribute("aria-label") ??
		(active as HTMLInputElement).labels?.[0]?.textContent ??
		active.textContent ??
		"";
	return {
		label: `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ""} "${name.trim().slice(0, 30)}"`,
		index,
		count,
		ring: {
			drawn: style.outlineStyle !== "none" && width > 0,
			width,
			contrast,
			clipped,
		},
		covered,
		onScreen:
			box.top >= 0 &&
			box.left >= 0 &&
			box.right <= window.innerWidth &&
			box.bottom <= window.innerHeight,
	};
}

/**
 * Presses Tab until focus leaves the page's controls, and reports every stop,
 * the last of them the one that left. Gives up after a hundred presses, which
 * is what a keyboard trap looks like.
 */
export async function tabThrough(page: Page): Promise<Stop[]> {
	const stops: Stop[] = [];
	for (let press = 0; press < 100; press++) {
		await page.keyboard.press("Tab");
		const stop = await page.evaluate(describeFocus);
		stops.push(stop);
		if (stop.index === -1) break;
	}
	return stops;
}

/** Presses Shift+Tab that many times and reports each stop. */
export async function tabBack(page: Page, presses: number): Promise<Stop[]> {
	const stops: Stop[] = [];
	for (let press = 0; press < presses; press++) {
		await page.keyboard.press("Shift+Tab");
		stops.push(await page.evaluate(describeFocus));
	}
	return stops;
}
