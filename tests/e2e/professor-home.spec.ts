import { type App, expect, test } from "../support/app";

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
});
