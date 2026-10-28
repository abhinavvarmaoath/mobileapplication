import { type App, expect, test } from "../support/app";
import { localSite } from "../support/data";

async function fillAndSubmit(app: App, repassword: string): Promise<void> {
	const { page } = app;
	await page.locator("#ID").fill("u1");
	await page.locator("#password").fill("pw1");
	await page.locator("#repassword").fill(repassword);
	await page.locator("#name").fill("Real Name");
	await page.locator("#email").fill("a@b.co");
	await page.locator("#phone").fill("555-0100");
	await page.getByRole("button", { name: "Signup" }).click();
}

test.beforeEach(async ({ app }) => {
	await app.open("signup.html");
});

// Known bug B4: four inputs share the name "name", and nothing compares the
// two passwords.
test("posts four fields under one name and ignores a password mismatch", async ({
	app,
}) => {
	await fillAndSubmit(app, "different");
	await expect.poll(() => app.backend.callsTo("signup.php")).toHaveLength(1);
	const [call] = app.backend.callsTo("signup.php");
	expect(call?.method).toBe("POST");
	expect(call?.form).toEqual({
		ID: ["u1"],
		password: ["pw1"],
		name: ["different", "Real Name", "a@b.co", "555-0100"],
		Type: ["Student"],
	});
});

test("goes to the login page when the server answers True", async ({ app }) => {
	await fillAndSubmit(app, "pw1");
	await expect
		.poll(() => app.consoleErrors.join("\n"))
		.toContain(`${localSite}index.html`);
});

test("stays put and says nothing when the server answers anything else", async ({
	app,
}) => {
	app.backend.reply("signup.php", { json: { status: "False" } });
	await fillAndSubmit(app, "pw1");
	await app.idle();
	expect(app.consoleErrors.some((text) => text.includes("file:///"))).toBe(
		false,
	);
	expect(app.dialogs).toEqual([]);
});

test("Cancel clears the form without sending anything", async ({ app }) => {
	await app.page.locator("#ID").fill("u1");
	await app.page.getByRole("button", { name: "Cancel" }).click();
	await expect(app.page.locator("#ID")).toHaveValue("");
	expect(app.backend.callsTo("signup.php")).toHaveLength(0);
});
