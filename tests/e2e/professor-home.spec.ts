import { type App, expect, test } from "../support/app";
import { localSite } from "../support/data";

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

	// Known bug B2: the error handler reports success.
	test("says the class was added even when the request fails", async ({
		app,
	}) => {
		app.backend.reply("adduser.php", { status: 500 });
		await addClass(app);
		await expect.poll(() => app.dialogs).toEqual(["Class added!"]);
	});

	test("links to the student list", async ({ app }) => {
		await expect(
			app.page.locator("a", { hasText: "View Students" }),
		).toHaveAttribute("href", "student.html");
	});

	// Known bug B9: the link only works on the original developer's machine.
	test("logs out through an absolute local file path", async ({ app }) => {
		await expect(app.page.locator("a", { hasText: "Logout" })).toHaveAttribute(
			"href",
			`${localSite}index.html`,
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

	// Known bug B6: the six popups share one id.
	test("gives the six popups the same id", async ({ app }) => {
		await expect(app.page.locator('[id="popupVideo"]')).toHaveCount(6);
	});

	test("opens the first popup whichever button is pressed", async ({ app }) => {
		await app.page.locator('a[data-rel="popup"]').nth(2).click();
		await expect(app.page.locator(".ui-popup-active iframe")).toHaveAttribute(
			"src",
			"http://varmapp.com/index.html",
		);
	});
});
