import { type App, expect, test } from "../support/app";
import { studentGrades } from "../support/data";

const marks = Object.fromEntries(
	["Homework", "Labs", "Project", "Presentation", "Midterm", "Final"].map(
		(category) => [`M${category}`, ["60"]],
	),
);

test.describe("student home", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("stuhome.html");
	});

	test("offers a collapsible answer to who the professor is", async ({
		app,
	}) => {
		const answer = app.page.getByText("Professor Neumann");
		await expect(answer).toBeHidden();
		await app.page.getByText("Who is my professor?").click();
		await expect(answer).toBeVisible();
	});

	test("logs out to the login page", async ({ app }) => {
		await expect(
			app.page.getByRole("link", { name: "Logout" }),
		).toHaveAttribute("href", "index.html");
	});

	test("marks Home as the current tab", async ({ app }) => {
		await expect(
			app.page.getByRole("navigation").getByRole("link", { name: "Home" }),
		).toHaveAttribute("aria-current", "page");
	});
});

const categories = [
	"Homework",
	"Labs",
	"Project",
	"Presentation",
	"Midterm",
	"Final",
];

async function fillMarks(app: App, value: string): Promise<void> {
	for (const name of categories) {
		await app.page.getByLabel(name, { exact: true }).fill(value);
	}
}

async function compute(app: App): Promise<void> {
	await app.page.getByRole("button", { name: "Compute grade" }).click();
}

test.describe("grade estimator", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("viewGrades.html");
	});

	// Known bug B10: the page always acts for student 1 in course 1.
	test("posts the marks and shows the estimate, for a fixed student and course", async ({
		app,
	}) => {
		await fillMarks(app, "60");
		await compute(app);
		await expect
			.poll(() => app.backend.callsTo("computegradestudent.php"))
			.toHaveLength(1);
		const [call] = app.backend.callsTo("computegradestudent.php");
		expect(call?.method).toBe("POST");
		expect(call?.form).toEqual({
			CourseId: ["1"],
			StudentId: ["1"],
			...marks,
		});
		const result = app.page.getByRole("status");
		await expect(result).toContainText("Estimated grade B");
		await expect(result).toContainText("Percentage 81");
	});

	test("asks for every mark instead of sending nothing", async ({ app }) => {
		await compute(app);
		await expect(app.page.getByRole("alert").getByRole("link")).toHaveText(
			categories.map((name) => `${name} is required`),
		);
		await app.idle();
		expect(app.backend.callsTo("computegradestudent.php")).toHaveLength(0);
	});

	test("refuses a mark outside 0 to 100", async ({ app }) => {
		await fillMarks(app, "60");
		await app.page.getByLabel("Homework", { exact: true }).fill("101");
		await compute(app);
		await expect(app.page.getByRole("alert")).toContainText(
			"Homework must be between 0 and 100",
		);
		expect(app.backend.callsTo("computegradestudent.php")).toHaveLength(0);
	});

	test("accepts a mark with a decimal part", async ({ app }) => {
		await fillMarks(app, "60");
		await app.page.getByLabel("Final", { exact: true }).fill("72.5");
		await compute(app);
		await expect
			.poll(() => app.backend.callsTo("computegradestudent.php"))
			.toHaveLength(1);
		expect(
			app.backend.callsTo("computegradestudent.php")[0]?.form.MFinal,
		).toEqual(["72.5"]);
	});

	test("links to the grades list", async ({ app }) => {
		await expect(
			app.page.getByRole("link", { name: "View grades" }),
		).toHaveAttribute("href", "grades.html");
	});

	test("reports a failed estimate and keeps the marks", async ({ app }) => {
		app.backend.reply("computegradestudent.php", { status: 500 });
		await fillMarks(app, "60");
		await compute(app);
		await expect(app.page.getByRole("alert")).toHaveText(
			"The server did not accept that. Try again.",
		);
		await expect(app.page.getByLabel("Homework", { exact: true })).toHaveValue(
			"60",
		);
	});

	test("forgets an old estimate when computing a new one", async ({ app }) => {
		await fillMarks(app, "60");
		await compute(app);
		await expect(app.page.getByRole("status")).toContainText(
			"Estimated grade B",
		);
		app.backend.reply("computegradestudent.php", { status: 500 });
		await compute(app);
		await expect(app.page.getByRole("alert")).toBeVisible();
		// Empty, and so hidden, which is why role lookup would not find it.
		await expect(app.page.locator(".result")).toBeEmpty();
	});

	test("shows markup in the estimate as plain text", async ({ app }) => {
		const grade = '<img src=x onerror="window.__xss=1">';
		app.backend.reply("computegradestudent.php", {
			json: { grade, percentage: "1" },
		});
		await fillMarks(app, "60");
		await compute(app);
		const result = app.page.getByRole("status");
		await expect(result).toContainText(grade);
		await expect(result.locator("img")).toHaveCount(0);
	});

	test("leaves window.print alone and does not log the form values", async ({
		app,
	}) => {
		const native = await app.page.evaluate(() =>
			String(window.print).includes("[native code]"),
		);
		expect(native).toBe(true);
		await fillMarks(app, "60");
		await compute(app);
		await app.idle();
		expect(app.consoleLogs.some((line) => line.startsWith("courseId="))).toBe(
			false,
		);
	});
});

test.describe("grades list", () => {
	// Known bug B10: the request carries no student or course.
	test("asks for the grades without saying whose", async ({ app }) => {
		await app.open("grades.html");
		const [call] = app.backend.callsTo("student.php");
		expect(app.backend.callsTo("student.php")).toHaveLength(1);
		expect(call?.method).toBe("GET");
		expect(call?.query).toEqual({});
		expect(call?.form).toEqual({});
	});

	test("shows each grade in its own place", async ({ app }) => {
		await app.open("grades.html");
		await expect(app.page.getByRole("term")).toHaveText([
			...categories,
			"Grade",
		]);
		await expect(app.page.getByRole("definition")).toHaveText([
			...categories.map(
				(name) => studentGrades[name as keyof typeof studentGrades],
			),
			studentGrades.Grade,
		]);
	});

	test("says it is loading until the grades arrive", async ({ app }) => {
		app.backend.reply("student.php", { json: studentGrades, delayMs: 400 });
		await app.page.goto("/grades.html");
		await expect(app.page.getByRole("status")).toHaveText(
			"Loading your grades…",
		);
		await expect(app.page.locator("main")).toHaveAttribute("aria-busy", "true");
		await expect(app.page.getByRole("definition")).toHaveCount(7);
		await expect(app.page.locator("main")).not.toHaveAttribute(
			"aria-busy",
			"true",
		);
	});

	test("says so when the request fails, and tries again on request", async ({
		app,
	}) => {
		app.backend.reply("student.php", { status: 500 });
		await app.open("grades.html");
		await expect(app.page.getByRole("alert")).toContainText(
			"Your grades could not be loaded.",
		);
		await expect(app.page.getByRole("definition")).toHaveCount(0);
		app.backend.reply("student.php", { json: studentGrades });
		await app.page.getByRole("button", { name: "Try again" }).click();
		await expect(app.page.getByRole("definition")).toHaveCount(7);
		await expect(app.page.getByRole("alert")).toHaveCount(0);
	});

	test("shows markup in a grade as plain text", async ({ app }) => {
		const homework = '<img src=x onerror="window.__xss=1">';
		app.backend.reply("student.php", {
			json: { ...studentGrades, Homework: homework },
		});
		await app.open("grades.html");
		await expect(app.page.getByRole("definition").first()).toHaveText(homework);
		await expect(app.page.locator("dd img")).toHaveCount(0);
	});
});
