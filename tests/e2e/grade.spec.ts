import { type App, expect, test } from "../support/app";
import { chooseCourse, chooseStudent, openSettings } from "../support/screens";

const marks = Object.fromEntries(
	["Homework", "Labs", "Project", "Presentation", "Midterm", "Final"].map(
		(category) => [`M${category}`, ["60"]],
	),
);

async function compute(app: App): Promise<void> {
	await openSettings(app.page);
	await app.page.locator("#gr button[type=submit]").click();
}

test.beforeEach(async ({ app }) => {
	await app.open("grade.html");
});

test("loads the students of the chosen course", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await expect(app.page.locator("#student .dropdown-item")).toHaveText([
		"Ada Lovelace",
		"Alan Turing",
	]);
	const [call] = app.backend.callsTo("get_students_by_course.php");
	expect(call?.method).toBe("GET");
	expect(call?.query).toEqual({ courseId: "1" });
});

test("fills the hidden ids from the chosen course and student", async ({
	app,
}) => {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Alan Turing");
	await expect(app.page.locator("#CourseId")).toHaveValue("1");
	await expect(app.page.locator("#StudentId")).toHaveValue("8");
});

test("computes the grade for the chosen course and student", async ({
	app,
}) => {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	await compute(app);
	await expect
		.poll(() => app.backend.callsTo("compute_and_save_grade.php"))
		.toHaveLength(1);
	const [call] = app.backend.callsTo("compute_and_save_grade.php");
	expect(call?.method).toBe("POST");
	expect(call?.form).toEqual({ CourseId: ["1"], StudentId: ["7"], ...marks });
	await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
		"Computed Grade is :B Total Grade :81% Marks :400",
		{ useInnerText: true },
	);
});

// Known bug B3: nothing stops a computation before a course and student are chosen.
test("computes with empty ids when nothing is chosen", async ({ app }) => {
	await compute(app);
	await expect
		.poll(() => app.backend.callsTo("compute_and_save_grade.php"))
		.toHaveLength(1);
	expect(app.backend.callsTo("compute_and_save_grade.php")[0]?.form).toEqual({
		CourseId: [""],
		StudentId: [""],
		...marks,
	});
});

// Known bug B7: students of an earlier course stay in the list.
test("keeps the students of the previous course when the course changes", async ({
	app,
}) => {
	await chooseCourse(app.page, "CMPE 235");
	await expect(app.page.locator("#student .dropdown-item")).toHaveCount(2);
	await chooseCourse(app.page, "ENGR 297");
	await expect(app.page.locator("#student .dropdown-item")).toHaveText([
		"Ada Lovelace",
		"Alan Turing",
		"Grace Hopper",
	]);
});

// Known bug B2: there is no error handler, so a failure is silent.
test("says nothing when the computation fails", async ({ app }) => {
	app.backend.reply("compute_and_save_grade.php", { status: 500 });
	await compute(app);
	await app.idle();
	await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText("");
});

// Known bug S2: the grade and the student names are inserted as HTML.
test("runs script hidden in the computed grade", async ({ app }) => {
	app.backend.reply("compute_and_save_grade.php", {
		json: {
			grade: '<img src=x onerror="window.__xss=1">',
			percentage: "1",
			totalMarks: "1",
		},
	});
	await compute(app);
	await expect
		.poll(() =>
			app.page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
		)
		.toBe(1);
});

test("runs script hidden in a student name", async ({ app }) => {
	app.backend.reply("get_students_by_course.php", {
		json: [
			{
				ID: "7",
				FirstName: '</option></select><img src=x onerror="window.__xss=1">',
				LastName: "Lovelace",
			},
		],
	});
	await chooseCourse(app.page, "CMPE 235");
	await expect
		.poll(() =>
			app.page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
		)
		.toBe(1);
});

// Known bug B8: the page replaces window.print and logs the form on every click.
test("replaces window.print", async ({ app }) => {
	const native = await app.page.evaluate(() =>
		String(window.print).includes("[native code]"),
	);
	expect(native).toBe(false);
});

test("logs the form values when a button is pressed", async ({ app }) => {
	await compute(app);
	await expect
		.poll(() => app.consoleLogs.some((line) => line.startsWith("courseId=")))
		.toBe(true);
});
