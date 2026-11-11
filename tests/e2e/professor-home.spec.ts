import { type App, expect, test } from "../support/app";

const greensheet =
	"http://openloop.com/education/classes/sjsu_engr/engr_mobile_dev/fall2015/index.php";

async function addClass(app: App): Promise<void> {
	const { page } = app;
	await page.getByRole("button", { name: "Add a class" }).click();
	await page.locator("#class").fill("101");
	await page.locator("#description").fill("Intro");
	await page.getByRole("button", { name: "Add", exact: true }).click();
}

test.describe("professor home", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("prohome.html");
	});

	test("adds a class by posting its number and description", async ({
		app,
	}) => {
		await addClass(app);
		await expect.poll(() => app.backend.callsTo("adduser.php")).toHaveLength(1);
		const [call] = app.backend.callsTo("adduser.php");
		expect(call?.method).toBe("POST");
		expect(call?.form).toEqual({ class: ["101"], description: ["Intro"] });
		await expect.poll(() => app.dialogs).toEqual(["Class added!"]);
	});

	test("says the class could not be added when the request fails", async ({
		app,
	}) => {
		app.backend.reply("adduser.php", { status: 500 });
		await addClass(app);
		await expect
			.poll(() => app.dialogs)
			.toEqual(["The class could not be added. Please try again."]);
	});

	test("links to the student list", async ({ app }) => {
		await expect(
			app.page.locator("a", { hasText: "View Students" }),
		).toHaveAttribute("href", "student.html");
	});

	test("logs out to the login page", async ({ app }) => {
		await expect(app.page.locator("a", { hasText: "Logout" })).toHaveAttribute(
			"href",
			"index.html",
		);
	});

	test("embeds the greensheet from a third-party host on every load", async ({
		app,
	}) => {
		const frame = app.page.locator("iframe");
		await expect(frame).toHaveAttribute("src", greensheet);
		expect(new Set(app.backend.frames)).toEqual(new Set([greensheet]));
	});
});

test.describe("student list", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("student.html");
	});

	test("lists six students, each with its own button", async ({ app }) => {
		await expect(app.page.locator('a[data-rel="popup"]')).toHaveCount(6);
	});

	test("gives each popup its own id", async ({ app }) => {
		for (const number of [1, 2, 3, 4, 5, 6]) {
			await expect(
				app.page.locator(`[id="popupStudent${number}"]`),
			).toHaveCount(1);
		}
	});

	test("opens the popup of the button that was pressed", async ({ app }) => {
		const popupFrame = app.page.locator(".ui-popup-active iframe");
		await app.page.locator('a[data-rel="popup"]').nth(2).click();
		await expect(popupFrame).toHaveAttribute("src", "http://varmapp.com");
		await app.page.keyboard.press("Escape");
		await expect(popupFrame).toHaveCount(0);
		await app.page.locator('a[data-rel="popup"]').first().click();
		await expect(popupFrame).toHaveAttribute(
			"src",
			"http://varmapp.com/index.html",
		);
	});
});
