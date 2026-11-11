import { type App, expect, test } from "../support/app";

async function logIn(app: App): Promise<void> {
	await app.page.locator("#ID").fill("ada");
	await app.page.locator("#password").fill("secret");
	await app.page.getByRole("button", { name: "Login" }).click();
}

test.beforeEach(async ({ app }) => {
	await app.open("index.html");
});

test("posts the credentials and the account type", async ({ app }) => {
	await logIn(app);
	await expect.poll(() => app.backend.callsTo("login.php")).toHaveLength(1);
	const [call] = app.backend.callsTo("login.php");
	expect(call?.method).toBe("POST");
	expect(call?.form).toEqual({
		ID: ["ada"],
		password: ["secret"],
		slider2: ["student"],
	});
});

test("sends a professor to the professor home", async ({ app }) => {
	app.backend.reply("login.php", { json: { status: "Prof" } });
	await logIn(app);
	await expect(app.page).toHaveURL(/\/prohome\.html$/);
});

// Known bug B1: anything but "Prof", including a failure, opens the student home.
test("sends every other reply to the student home, failures included", async ({
	app,
}) => {
	app.backend.reply("login.php", { json: { status: "False" } });
	await logIn(app);
	await expect(app.page).toHaveURL(/\/stuhome\.html$/);
});

test("stays on the page and says nothing when the request fails", async ({
	app,
}) => {
	app.backend.reply("login.php", { status: 500 });
	await logIn(app);
	await app.idle();
	expect(app.dialogs).toEqual([]);
	await expect(app.page).toHaveURL(/index\.html$/);
});

test("clears the form without sending anything when Cancel is pressed", async ({
	app,
}) => {
	await app.page.locator("#ID").fill("ada");
	await app.page.getByRole("button", { name: "Cancel" }).click();
	await expect(app.page.locator("#ID")).toHaveValue("");
	await app.idle();
	expect(app.backend.callsTo("login.php")).toHaveLength(0);
});

test("lets the browser offer saved credentials", async ({ app }) => {
	await expect(app.page.locator("#ID")).toHaveAttribute(
		"autocomplete",
		"username",
	);
	await expect(app.page.locator("#password")).toHaveAttribute(
		"autocomplete",
		"current-password",
	);
});

test("links to signup", async ({ app }) => {
	await expect(app.page.locator("a", { hasText: "Signup" })).toHaveAttribute(
		"href",
		"signup.html",
	);
});
