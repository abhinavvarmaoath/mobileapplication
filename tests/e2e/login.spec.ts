import { type App, expect, test } from "../support/app";
import { localSite } from "../support/data";

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
	await expect
		.poll(() => app.consoleErrors.join("\n"))
		.toContain(`${localSite}prohome.html`);
});

// Known bug B1: anything but "Prof", including a failure, opens the student home.
test("sends every other reply to the student home, failures included", async ({
	app,
}) => {
	app.backend.reply("login.php", { json: { status: "False" } });
	await logIn(app);
	await expect
		.poll(() => app.consoleErrors.join("\n"))
		.toContain(`${localSite}stuhome.html`);
});

test("stays on the page and says nothing when the request fails", async ({
	app,
}) => {
	app.backend.reply("login.php", { status: 500 });
	await logIn(app);
	await app.idle();
	expect(app.consoleErrors.some((text) => text.includes("file:///"))).toBe(
		false,
	);
	expect(app.dialogs).toEqual([]);
	await expect(app.page).toHaveURL(/index\.html$/);
});

// Known bug B5: Cancel is a submit button.
test("submits the form when Cancel is pressed", async ({ app }) => {
	await app.page.getByRole("button", { name: "Cancel" }).click();
	await expect.poll(() => app.backend.callsTo("login.php")).toHaveLength(1);
	expect(app.backend.callsTo("login.php")[0]?.form).toEqual({
		ID: [""],
		password: [""],
		slider2: ["student"],
	});
});

// Known bug B9: the link only works on the original developer's machine.
test("links to signup through an absolute local file path", async ({ app }) => {
	await expect(app.page.locator("a", { hasText: "Signup" })).toHaveAttribute(
		"href",
		`${localSite}signup.html`,
	);
});
