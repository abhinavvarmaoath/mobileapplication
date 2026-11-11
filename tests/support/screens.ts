import type { Locator, Page } from "@playwright/test";

// The specs only talk to the course and student pickers and the settings
// section through these helpers, so changing the widgets means changing this
// file and not the specs.

async function pick(page: Page, picker: string, label: string): Promise<void> {
	// Options arrive from the API after the page opens, so wait for them first.
	await page
		.locator(`${picker} option:not([value=""])`)
		.first()
		.waitFor({ state: "attached" });
	await page.locator(picker).selectOption({ label });
}

/** The courses on offer in the course picker. */
export function courseItems(page: Page): Locator {
	return page.locator('#course option:not([value=""])');
}

/** The students on offer in the student picker. */
export function studentItems(page: Page): Locator {
	return page.locator('#student option:not([value=""])');
}

export function chooseCourse(page: Page, name: string): Promise<void> {
	return pick(page, "#course", name);
}

export function chooseStudent(page: Page, name: string): Promise<void> {
	return pick(page, "#student", name);
}

/** Opens the collapsed form on the setup and grading pages. */
export async function openSettings(page: Page): Promise<void> {
	await page.locator("details.settings summary").click();
}
