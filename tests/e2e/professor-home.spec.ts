import { type App, expect, test } from "../support/app";

async function addClass(
	app: App,
	{ number = "101", description = "Intro" } = {},
): Promise<void> {
	const { page } = app;
	await page.getByLabel("Class number", { exact: true }).fill(number);
	await page.getByLabel("Description", { exact: true }).fill(description);
	await page.getByRole("button", { name: "Add class" }).click();
}

test.beforeEach(async ({ app }) => {
	await app.open("prohome.html");
});

test("adds a class by posting its number and description", async ({ app }) => {
	await addClass(app);
	await expect.poll(() => app.backend.callsTo("adduser.php")).toHaveLength(1);
	const [call] = app.backend.callsTo("adduser.php");
	expect(call?.method).toBe("POST");
	expect(call?.form).toEqual({ class: ["101"], description: ["Intro"] });
	await expect(app.page.getByRole("status")).toHaveText("Class added.");
});

test("empties the form once the class is added", async ({ app }) => {
	await addClass(app);
	await expect(app.page.getByRole("status")).toHaveText("Class added.");
	await expect(
		app.page.getByLabel("Class number", { exact: true }),
	).toHaveValue("");
	await expect(app.page.getByLabel("Description", { exact: true })).toHaveValue(
		"",
	);
});

test("asks for a class number instead of sending nothing", async ({ app }) => {
	await app.page.getByRole("button", { name: "Add class" }).click();
	await expect(app.page.getByRole("alert")).toContainText(
		"Class number is required",
	);
	await app.idle();
	expect(app.backend.callsTo("adduser.php")).toHaveLength(0);
});

test("leaves the description optional", async ({ app }) => {
	await addClass(app, { description: "" });
	await expect.poll(() => app.backend.callsTo("adduser.php")).toHaveLength(1);
	expect(app.backend.callsTo("adduser.php")[0]?.form.description).toEqual([""]);
});

test("says the class could not be added when the request fails", async ({
	app,
}) => {
	app.backend.reply("adduser.php", { status: 500 });
	await addClass(app);
	await expect(app.page.getByRole("alert")).toHaveText(
		"The server did not accept that. Try again.",
	);
	// An empty status is hidden, so role lookup finds none.
	await expect(app.page.getByRole("status")).toHaveCount(0);
	await expect(
		app.page.getByLabel("Class number", { exact: true }),
	).toHaveValue("101");
});

test("clears the form and its messages when Clear is pressed", async ({
	app,
}) => {
	await app.page.getByRole("button", { name: "Add class" }).click();
	await expect(app.page.getByRole("alert")).toBeVisible();
	await app.page.getByLabel("Class number", { exact: true }).fill("202");
	await app.page.getByRole("button", { name: "Clear" }).click();
	await expect(
		app.page.getByLabel("Class number", { exact: true }),
	).toHaveValue("");
	await expect(app.page.getByRole("alert")).toHaveCount(0);
	expect(app.backend.callsTo("adduser.php")).toHaveLength(0);
});

test("links to the student list", async ({ app }) => {
	await expect(
		app.page.getByRole("link", { name: "View students" }),
	).toHaveAttribute("href", "student.html");
});

test("logs out to the login page", async ({ app }) => {
	await expect(app.page.getByRole("link", { name: "Logout" })).toHaveAttribute(
		"href",
		"index.html",
	);
});

test("marks Home as the current tab", async ({ app }) => {
	await expect(
		app.page.getByRole("navigation").getByRole("link", { name: "Home" }),
	).toHaveAttribute("aria-current", "page");
});
