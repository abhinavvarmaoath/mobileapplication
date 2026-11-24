import { expect, test } from "../support/app";
import { useConfig } from "../support/config";
import { tabBack, tabThrough } from "../support/keyboard";
import { pages } from "../support/pages";
import { studentItems } from "../support/screens";

// What a person who cannot use a mouse needs: to reach every control in a
// sensible order, to see where they are, never to lose their place, and to get
// out of anything they get into. Axe cannot check most of this.

// Login and signup stand alone. Every other page sits in the shell, which
// starts with a skip link.
const standalone = ["index.html", "signup.html"];

for (const scheme of ["light", "dark"] as const) {
	for (const path of pages) {
		test(`${path}: Tab reaches every control in order and shows where focus is, in ${scheme}`, async ({
			app,
		}) => {
			await app.page.emulateMedia({ colorScheme: scheme });
			await app.open(path);
			await app.idle();

			const stops = await tabThrough(app.page);
			const count = stops[0]?.count ?? 0;
			expect(count, "controls on the page").toBeGreaterThan(0);
			const visited = stops.slice(0, count);

			// Document order, nothing skipped, nothing stolen, and a way out.
			expect(visited.map((stop) => stop.index)).toEqual([...visited.keys()]);
			expect(stops[count]?.index, "the press after the last control").toBe(-1);

			const problems = visited.flatMap((stop) => {
				const { ring } = stop;
				return [
					ring.drawn ? "" : "has no focus ring",
					ring.width >= 2 ? "" : `has a ring ${ring.width}px thick`,
					ring.contrast >= 3
						? ""
						: `has a ring with ${ring.contrast.toFixed(1)}:1 contrast`,
					ring.clipped ? "has a ring that is cut off" : "",
				]
					.filter(Boolean)
					.map((problem) => `${stop.label} ${problem}`);
			});
			expect(problems).toEqual([]);

			if (!standalone.includes(path)) {
				expect(visited[0]?.label).toContain("Skip to content");
				expect(visited[0]?.onScreen, "the skip link, once focused").toBe(true);
			}

			if (scheme === "light") {
				const back = await tabBack(app.page, count);
				expect(back.map((stop) => stop.index)).toEqual(
					[...visited.keys()].reverse(),
				);
			}
		});
	}
}

test.describe("on a short phone screen", () => {
	// The tab bar is fixed to the bottom, so a page taller than the window
	// scrolls under it.
	test.use({ viewport: { width: 390, height: 480 } });

	for (const path of pages) {
		test(`${path}: the tab bar never covers the control that has focus`, async ({
			app,
		}) => {
			await app.open(path);
			await app.idle();
			const stops = await tabThrough(app.page);
			expect(
				stops.filter((stop) => stop.covered).map((stop) => stop.label),
			).toEqual([]);
		});
	}
});

test.describe("from the keyboard alone", () => {
	test("logs in, choosing the account type with the arrow keys", async ({
		app,
	}) => {
		app.backend.reply("login.php", { json: { status: "Prof" } });
		await app.open("index.html");
		const { keyboard } = app.page;

		await keyboard.press("Tab");
		await keyboard.type("ada");
		await keyboard.press("Tab");
		await keyboard.type("secret");
		await keyboard.press("Tab");
		// The account types are one stop, at the chosen one.
		await expect(
			app.page.getByRole("radio", { name: "Student" }),
		).toBeFocused();
		await keyboard.press("ArrowRight");
		await expect(
			app.page.getByRole("radio", { name: "Professor" }),
		).toBeChecked();
		await keyboard.press("Tab");
		await expect(
			app.page.getByRole("button", { name: "Cancel" }),
		).toBeFocused();
		await keyboard.press("Tab");
		await expect(app.page.getByRole("button", { name: "Login" })).toBeFocused();
		await keyboard.press("Enter");

		await expect(app.page).toHaveURL(/\/prohome\.html$/);
		expect(app.backend.callsTo("login.php")[0]?.form).toEqual({
			ID: ["ada"],
			password: ["secret"],
			slider2: ["professor"],
		});
	});

	test("Enter in a field submits the form", async ({ app }) => {
		await app.open("index.html");
		await app.page.getByLabel("Username", { exact: true }).fill("ada");
		const password = app.page.getByLabel("Password", { exact: true });
		await password.fill("secret");
		await password.press("Enter");
		await expect.poll(() => app.backend.callsTo("login.php")).toHaveLength(1);
	});

	test("a form that is not filled in says what is wrong, and its links lead to the fields", async ({
		app,
	}) => {
		await app.open("index.html");
		const { keyboard } = app.page;
		await app.page.getByRole("button", { name: "Login" }).focus();
		await keyboard.press("Enter");

		const summary = app.page.getByRole("alert");
		await expect(summary).toBeFocused();
		await keyboard.press("Tab");
		await expect(
			summary.getByRole("link", { name: "Username is required" }),
		).toBeFocused();
		await keyboard.press("Enter");
		const username = app.page.getByLabel("Username", { exact: true });
		await expect(username).toBeFocused();
		await keyboard.type("ada");
		await expect(username).toHaveValue("ada");
	});

	test("grades a student and stays on the button that did it", async ({
		app,
	}) => {
		app.backend.reply("compute_and_save_grade.php", {
			json: { grade: "B", percentage: "81", totalMarks: "400" },
			delayMs: 200,
		});
		await app.open("grade.html");
		const { keyboard } = app.page;

		await app.page.getByLabel("Course", { exact: true }).focus();
		await keyboard.press("ArrowDown");
		await expect(studentItems(app.page)).toHaveCount(2);
		await keyboard.press("Tab");
		await keyboard.press("ArrowDown");
		for (let mark = 0; mark < 6; mark++) {
			await keyboard.press("Tab");
			await keyboard.type("60");
		}
		await keyboard.press("Tab");
		const compute = app.page.getByRole("button", { name: "Compute grade" });
		await expect(compute).toBeFocused();
		await keyboard.press("Enter");

		await expect(app.page.locator(".result")).toContainText("Computed grade B");
		await app.idle();
		await expect(compute).toBeFocused();
	});

	test("the skip link sends the next Tab to the first control on the page", async ({
		app,
	}) => {
		await app.open("grade.html");
		await app.idle();
		await app.page.keyboard.press("Tab");
		await expect(
			app.page.getByRole("link", { name: "Skip to content" }),
		).toBeFocused();
		await app.page.keyboard.press("Enter");
		await app.page.keyboard.press("Tab");
		await expect(app.page.getByLabel("Course", { exact: true })).toBeFocused();
	});

	test("a tool opens and closes without the mouse, and focus goes back to its button", async ({
		app,
	}) => {
		await useConfig(app.page, { embedTools: true });
		await app.open("prohome.html");
		const open = app.page.getByRole("button", { name: "View Greensheet" });
		await open.focus();
		await app.page.keyboard.press("Enter");
		await expect(app.page.getByRole("button", { name: "Close" })).toBeFocused();
		await app.page.keyboard.press("Escape");
		await expect(app.page.locator("dialog[open]")).toHaveCount(0);
		await expect(open).toBeFocused();
	});

	test("a disclosure opens with Enter and closes with Space", async ({
		app,
	}) => {
		await app.open("stuhome.html");
		await app.page.getByText("Who is my professor?").focus();
		await app.page.keyboard.press("Enter");
		await expect(app.page.getByText("Professor Neumann")).toBeVisible();
		await app.page.keyboard.press("Space");
		await expect(app.page.getByText("Professor Neumann")).toBeHidden();
	});
});
