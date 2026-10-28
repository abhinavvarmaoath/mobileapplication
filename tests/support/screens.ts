import type { Page } from "@playwright/test";

// The specs only talk to the course and student pickers and the settings
// section through these helpers, so changing the widgets means changing this
// file and not the specs.

async function pick(page: Page, menu: string, label: string): Promise<void> {
	await page.locator(`${menu} .dropdown-deploy`).click();
	await page.locator(`${menu} .dropdown-item`, { hasText: label }).click();
}

export function chooseCourse(page: Page, name: string): Promise<void> {
	return pick(page, "#course", name);
}

export function chooseStudent(page: Page, name: string): Promise<void> {
	return pick(page, "#student", name);
}

/** Opens the collapsed form on the setup and grading pages. */
export async function openSettings(page: Page): Promise<void> {
	await page.locator(".hide-toggle-v4").click();
}
