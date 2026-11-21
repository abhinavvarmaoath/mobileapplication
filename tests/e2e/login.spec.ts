import { type App, expect, test } from "../support/app";

async function fillIn(app: App): Promise<void> {
	await app.page.getByLabel("Username", { exact: true }).fill("ada");
	await app.page.getByLabel("Password", { exact: true }).fill("secret");
}

async function logIn(app: App): Promise<void> {
	await fillIn(app);
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

test("posts the professor account type when Professor is chosen", async ({
	app,
}) => {
	await app.page.getByRole("radio", { name: "Professor" }).check();
	await logIn(app);
	await expect.poll(() => app.backend.callsTo("login.php")).toHaveLength(1);
	expect(app.backend.callsTo("login.php")[0]?.form.slider2).toEqual([
		"professor",
	]);
});

test("starts with the student account chosen", async ({ app }) => {
	await expect(app.page.getByRole("radio", { name: "Student" })).toBeChecked();
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

test.describe("when the request does not work out", () => {
	test("says so and stays on the page after a server error", async ({
		app,
	}) => {
		app.backend.reply("login.php", { status: 500 });
		await logIn(app);
		await expect(app.page.getByRole("alert")).toHaveText(
			"The server did not accept that. Try again.",
		);
		await expect(app.page).toHaveURL(/index\.html$/);
		expect(app.dialogs).toEqual([]);
	});

	test("says the server could not be reached when the network fails", async ({
		app,
	}) => {
		app.backend.reply("login.php", { abort: true });
		await logIn(app);
		await expect(app.page.getByRole("alert")).toContainText(
			"could not be reached",
		);
	});

	test("lets the visitor try again", async ({ app }) => {
		app.backend.reply("login.php", { status: 500 });
		await logIn(app);
		await expect(app.page.getByRole("alert")).toBeVisible();
		app.backend.reply("login.php", { json: { status: "Prof" } });
		await app.page.getByRole("button", { name: "Login" }).click();
		await expect(app.page).toHaveURL(/\/prohome\.html$/);
	});

	test("ignores a second press while the first is still waiting", async ({
		app,
	}) => {
		app.backend.reply("login.php", {
			json: { status: "Prof" },
			delayMs: 300,
		});
		await fillIn(app);
		const login = app.page.getByRole("button", { name: "Login" });
		await login.click();
		await expect(login).toBeDisabled();
		await expect(app.page.locator("form")).toHaveAttribute("aria-busy", "true");
		await expect(app.page).toHaveURL(/\/prohome\.html$/);
		expect(app.backend.callsTo("login.php")).toHaveLength(1);
	});
});

test("asks for a username and a password instead of sending nothing", async ({
	app,
}) => {
	await app.page.getByRole("button", { name: "Login" }).click();
	const summary = app.page.getByRole("alert");
	await expect(summary).toContainText("There is a problem");
	await expect(summary.getByRole("link")).toHaveText([
		"Username is required",
		"Password is required",
	]);
	await expect(
		app.page.getByLabel("Username", { exact: true }),
	).toHaveAttribute("aria-invalid", "true");
	await app.idle();
	expect(app.backend.callsTo("login.php")).toHaveLength(0);
});

test("clears the form and its messages without sending anything when Cancel is pressed", async ({
	app,
}) => {
	await app.page.getByRole("button", { name: "Login" }).click();
	await expect(app.page.getByRole("alert")).toBeVisible();
	await fillIn(app);
	await app.page.getByRole("radio", { name: "Professor" }).check();
	await app.page.getByRole("button", { name: "Cancel" }).click();
	await expect(app.page.getByLabel("Username", { exact: true })).toHaveValue(
		"",
	);
	await expect(app.page.getByRole("radio", { name: "Student" })).toBeChecked();
	await expect(app.page.getByRole("alert")).toHaveCount(0);
	await app.idle();
	expect(app.backend.callsTo("login.php")).toHaveLength(0);
});

test("lets the browser offer saved credentials", async ({ app }) => {
	await expect(
		app.page.getByLabel("Username", { exact: true }),
	).toHaveAttribute("autocomplete", "username");
	await expect(
		app.page.getByLabel("Password", { exact: true }),
	).toHaveAttribute("autocomplete", "current-password");
});

test("links to signup", async ({ app }) => {
	await expect(app.page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
		"href",
		"signup.html",
	);
});
