import { type App, expect, test } from "../support/app";

interface Entry {
	repassword?: string;
	email?: string;
}

async function fillIn(
	app: App,
	{ repassword = "pw1", email = "a@b.co" }: Entry = {},
) {
	const { page } = app;
	const field = (name: string) => page.getByLabel(name, { exact: true });
	await field("Username").fill("u1");
	await field("Password").fill("pw1");
	await field("Confirm password").fill(repassword);
	await field("Name").fill("Real Name");
	await field("Email").fill(email);
	await field("Phone").fill("555-0100");
}

async function signUp(app: App, entry?: Entry): Promise<void> {
	await fillIn(app, entry);
	await app.page.getByRole("button", { name: "Sign up" }).click();
}

test.beforeEach(async ({ app }) => {
	await app.open("signup.html");
});

// Known bug B4, half of it: the server gets four fields under the name "name".
// The other half, a password confirmation nobody compared, is fixed below.
test("posts four fields under one name", async ({ app }) => {
	await signUp(app);
	await expect.poll(() => app.backend.callsTo("signup.php")).toHaveLength(1);
	const [call] = app.backend.callsTo("signup.php");
	expect(call?.method).toBe("POST");
	expect(call?.form).toEqual({
		ID: ["u1"],
		password: ["pw1"],
		name: ["pw1", "Real Name", "a@b.co", "555-0100"],
		Type: ["Student"],
	});
});

test("posts the professor account type when Professor is chosen", async ({
	app,
}) => {
	await app.page.getByRole("radio", { name: "Professor" }).check();
	await signUp(app);
	await expect.poll(() => app.backend.callsTo("signup.php")).toHaveLength(1);
	expect(app.backend.callsTo("signup.php")[0]?.form.Type).toEqual(["Prof"]);
});

test("tells the browser what each field is", async ({ app }) => {
	const expected: Record<string, [string, string]> = {
		Username: ["text", "username"],
		Password: ["password", "new-password"],
		"Confirm password": ["password", "new-password"],
		Name: ["text", "name"],
		Email: ["email", "email"],
		Phone: ["tel", "tel"],
	};
	for (const [label, [type, autocomplete]] of Object.entries(expected)) {
		const field = app.page.getByLabel(label, { exact: true });
		await expect(field).toHaveAttribute("type", type);
		await expect(field).toHaveAttribute("autocomplete", autocomplete);
	}
});

test.describe("asks again instead of sending", () => {
	test("when the two passwords differ", async ({ app }) => {
		await signUp(app, { repassword: "different" });
		await expect(app.page.getByRole("alert")).toContainText(
			"Confirm password must match password",
		);
		await app.idle();
		expect(app.backend.callsTo("signup.php")).toHaveLength(0);
	});

	test("when the email address is not one", async ({ app }) => {
		await signUp(app, { email: "not an email" });
		await expect(app.page.getByRole("alert")).toContainText(
			"Email must be an email address",
		);
		await app.idle();
		expect(app.backend.callsTo("signup.php")).toHaveLength(0);
	});

	test("when the username and the passwords are empty", async ({ app }) => {
		await app.page.getByRole("button", { name: "Sign up" }).click();
		await expect(app.page.getByRole("alert").getByRole("link")).toHaveText([
			"Username is required",
			"Password is required",
			"Confirm password is required",
		]);
		await app.idle();
		expect(app.backend.callsTo("signup.php")).toHaveLength(0);
	});
});

test("leaves the name, email and phone optional", async ({ app }) => {
	const field = (name: string) => app.page.getByLabel(name, { exact: true });
	await field("Username").fill("u1");
	await field("Password").fill("pw1");
	await field("Confirm password").fill("pw1");
	await app.page.getByRole("button", { name: "Sign up" }).click();
	await expect.poll(() => app.backend.callsTo("signup.php")).toHaveLength(1);
	expect(app.backend.callsTo("signup.php")[0]?.form.name).toEqual([
		"pw1",
		"",
		"",
		"",
	]);
});

test("goes to the login page when the server answers True", async ({ app }) => {
	await signUp(app);
	await expect(app.page).toHaveURL(/\/index\.html$/);
});

test.describe("when the account is not created", () => {
	test("says so and stays put when the server answers anything else", async ({
		app,
	}) => {
		app.backend.reply("signup.php", { json: { status: "False" } });
		await signUp(app);
		await expect(app.page.getByRole("alert")).toHaveText(
			"The account could not be created. Check your details and try again.",
		);
		await expect(app.page).toHaveURL(/\/signup\.html$/);
		expect(app.dialogs).toEqual([]);
	});

	test("says so when the request fails", async ({ app }) => {
		app.backend.reply("signup.php", { status: 500 });
		await signUp(app);
		await expect(app.page.getByRole("alert")).toHaveText(
			"The server did not accept that. Try again.",
		);
		await expect(app.page).toHaveURL(/\/signup\.html$/);
	});
});

test("ignores a second press while the first is still waiting", async ({
	app,
}) => {
	app.backend.reply("signup.php", { json: { status: "True" }, delayMs: 300 });
	await fillIn(app);
	const button = app.page.getByRole("button", { name: "Sign up" });
	await button.click();
	await expect(button).toBeDisabled();
	await expect(app.page).toHaveURL(/\/index\.html$/);
	expect(app.backend.callsTo("signup.php")).toHaveLength(1);
});

test("Cancel clears the form and its messages without sending anything", async ({
	app,
}) => {
	await app.page.getByRole("button", { name: "Sign up" }).click();
	await expect(app.page.getByRole("alert")).toBeVisible();
	await app.page.getByLabel("Username", { exact: true }).fill("u1");
	await app.page.getByRole("button", { name: "Cancel" }).click();
	await expect(app.page.getByLabel("Username", { exact: true })).toHaveValue(
		"",
	);
	await expect(app.page.getByRole("alert")).toHaveCount(0);
	expect(app.backend.callsTo("signup.php")).toHaveLength(0);
});

test("links back to the login page", async ({ app }) => {
	await expect(app.page.getByRole("link", { name: "Login" })).toHaveAttribute(
		"href",
		"index.html",
	);
});
