import AxeBuilder from "@axe-core/playwright";
import { type App, expect, test } from "../support/app";
import { useConfig } from "../support/config";
import { pages } from "../support/pages";

// No page may have an axe finding at WCAG 2.2 AA or the best-practice rules,
// in light or dark, or in the states a visitor can put it in.
const tags = [
	"wcag2a",
	"wcag2aa",
	"wcag21a",
	"wcag21aa",
	"wcag22aa",
	"best-practice",
];

async function findings(app: App): Promise<string[]> {
	const results = await new AxeBuilder({ page: app.page })
		.withTags(tags)
		.analyze();
	return results.violations.map(
		(violation) => `${violation.id} on ${violation.nodes.length} element(s)`,
	);
}

for (const scheme of ["light", "dark"] as const) {
	for (const path of pages) {
		test(`${path} has no accessibility problems in ${scheme}`, async ({
			app,
		}) => {
			await app.page.emulateMedia({ colorScheme: scheme });
			await app.open(path);
			await app.idle();
			expect(await findings(app)).toEqual([]);
		});
	}
}

test.describe("states", () => {
	test("the login form with its problems showing", async ({ app }) => {
		await app.open("index.html");
		await app.page.getByRole("button", { name: "Login" }).click();
		await expect(app.page.getByRole("alert")).toBeVisible();
		expect(await findings(app)).toEqual([]);
	});

	test("a setup form with its problems showing, in dark", async ({ app }) => {
		await app.page.emulateMedia({ colorScheme: "dark" });
		await app.open("set2.html");
		await app.page.getByRole("button", { name: "Save scale" }).click();
		await expect(app.page.getByRole("alert")).toBeVisible();
		expect(await findings(app)).toEqual([]);
	});

	test("the grades list when it could not be loaded", async ({ app }) => {
		app.backend.reply("student.php", { status: 500 });
		await app.open("grades.html");
		await expect(app.page.getByRole("alert")).toBeVisible();
		expect(await findings(app)).toEqual([]);
	});

	test("the course list when it is empty", async ({ app }) => {
		app.backend.reply("get_course.php", { json: [] });
		await app.open("grade.html");
		await expect(app.page.getByText("There are no courses yet.")).toBeVisible();
		expect(await findings(app)).toEqual([]);
	});

	test("an embedded tool's dialog while it is open", async ({ app }) => {
		await useConfig(app.page, { embedTools: true });
		await app.open("team.html");
		await app.page
			.getByRole("button", { name: "Download Course Material" })
			.click();
		await expect(app.page.locator("dialog[open]")).toBeVisible();
		expect(await findings(app)).toEqual([]);
	});

	test("an estimate on the page", async ({ app }) => {
		await app.open("viewGrades.html");
		for (const name of [
			"Homework",
			"Labs",
			"Project",
			"Presentation",
			"Midterm",
			"Final",
		]) {
			await app.page.getByLabel(name, { exact: true }).fill("60");
		}
		await app.page.getByRole("button", { name: "Compute grade" }).click();
		await expect(app.page.getByRole("status")).toContainText("Estimated grade");
		expect(await findings(app)).toEqual([]);
	});
});
