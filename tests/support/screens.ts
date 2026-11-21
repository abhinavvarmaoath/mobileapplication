import type { Locator, Page } from "@playwright/test";

// The specs only talk to the course and student pickers and the settings
// section through these helpers, so changing the widgets means changing this
// file and not the specs.

// The course picker is #courseId on a new page and #course on an old one.
const coursePickers = ["#courseId", "#course"];
const studentPickers = ["#student"];

async function pick(
	page: Page,
	pickers: string[],
	label: string,
): Promise<void> {
	// Options arrive from the API after the page opens, so wait for them first.
	await page
		.locator(
			pickers.map((picker) => `${picker} option:not([value=""])`).join(", "),
		)
		.first()
		.waitFor({ state: "attached" });
	await page.locator(pickers.join(", ")).selectOption({ label });
}

/** The courses on offer in the course picker. */
export function courseItems(page: Page): Locator {
	return page.locator(
		coursePickers
			.map((picker) => `${picker} option:not([value=""])`)
			.join(", "),
	);
}

/** The students on offer in the student picker. */
export function studentItems(page: Page): Locator {
	return page.locator(
		studentPickers
			.map((picker) => `${picker} option:not([value=""])`)
			.join(", "),
	);
}

export function chooseCourse(page: Page, name: string): Promise<void> {
	return pick(page, coursePickers, name);
}

export function chooseStudent(page: Page, name: string): Promise<void> {
	return pick(page, studentPickers, name);
}

/** Opens the collapsed form on an old page; a new page has none to open. */
export async function openSettings(page: Page): Promise<void> {
	const settings = page.locator("details.settings");
	if ((await settings.count()) === 0) return;
	const open = await settings.evaluate(
		(element) => (element as HTMLDetailsElement).open,
	);
	if (!open) await settings.locator("summary").click();
}
