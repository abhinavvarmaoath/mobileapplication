import { type App, expect, test } from "../support/app";
import { studentsByCourse } from "../support/data";
import { chooseCourse, chooseStudent, studentItems } from "../support/screens";

const categories = [
	"Homework",
	"Labs",
	"Project",
	"Presentation",
	"Midterm",
	"Final",
];

const marks = Object.fromEntries(
	categories.map((category) => [`M${category}`, ["60"]]),
);

const studentPicker = (app: App) =>
	app.page.getByLabel("Student", { exact: true });

async function fillMarks(app: App, value = "60"): Promise<void> {
	for (const name of categories) {
		await app.page.getByLabel(name, { exact: true }).fill(value);
	}
}

async function compute(app: App): Promise<void> {
	await app.page.getByRole("button", { name: "Compute grade" }).click();
}

async function computeForStudent(app: App): Promise<void> {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	await fillMarks(app);
	await compute(app);
}

test.beforeEach(async ({ app }) => {
	await app.open("grade.html");
});

test("loads the students of the chosen course", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await expect(studentItems(app.page)).toHaveText([
		"Ada Lovelace",
		"Alan Turing",
	]);
	const [call] = app.backend.callsTo("get_students_by_course.php");
	expect(call?.method).toBe("GET");
	expect(call?.query).toEqual({ courseId: "1" });
});

test("computes the grade for the chosen course and student", async ({
	app,
}) => {
	await computeForStudent(app);
	await expect
		.poll(() => app.backend.callsTo("compute_and_save_grade.php"))
		.toHaveLength(1);
	const [call] = app.backend.callsTo("compute_and_save_grade.php");
	expect(call?.method).toBe("POST");
	expect(call?.form).toEqual({ CourseId: ["1"], StudentId: ["7"], ...marks });
	const result = app.page.getByRole("status");
	await expect(result).toContainText("Computed grade B");
	await expect(result).toContainText("Percentage 81");
	await expect(result).toContainText("Marks 400");
});

test("posts the student that was chosen", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Alan Turing");
	await fillMarks(app);
	await compute(app);
	await expect
		.poll(() => app.backend.callsTo("compute_and_save_grade.php"))
		.toHaveLength(1);
	expect(
		app.backend.callsTo("compute_and_save_grade.php")[0]?.form.StudentId,
	).toEqual(["8"]);
});

test("asks for a course, a student and every mark instead of computing", async ({
	app,
}) => {
	await compute(app);
	await expect(app.page.getByRole("alert").getByRole("link")).toHaveText([
		"Choose a course",
		"Choose a student",
		...categories.map((name) => `${name} is required`),
	]);
	await app.idle();
	expect(app.backend.callsTo("compute_and_save_grade.php")).toHaveLength(0);
});

test("asks for a student when only a course is chosen", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await fillMarks(app);
	await compute(app);
	await expect(app.page.getByRole("alert").getByRole("link")).toHaveText([
		"Choose a student",
	]);
	expect(app.backend.callsTo("compute_and_save_grade.php")).toHaveLength(0);
});

test("refuses a mark above 100", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	await fillMarks(app);
	await app.page.getByLabel("Final", { exact: true }).fill("101");
	await compute(app);
	await expect(app.page.getByRole("alert")).toContainText(
		"Final must be between 0 and 100",
	);
	expect(app.backend.callsTo("compute_and_save_grade.php")).toHaveLength(0);
});

test("lists only the students of the chosen course", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await expect(studentItems(app.page)).toHaveCount(2);
	await chooseCourse(app.page, "ENGR 297");
	await expect(studentItems(app.page)).toHaveText(["Grace Hopper"]);
});

test("forgets the chosen student when the course changes", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	await expect(studentPicker(app)).toHaveValue("7");
	await chooseCourse(app.page, "ENGR 297");
	await expect(studentPicker(app)).toHaveValue("");
});

// The old student must not stay chosen while the new list is on its way, or
// the old student could be sent with the new course.
test("forgets the chosen student at once, before the new list arrives", async ({
	app,
}) => {
	app.backend.reply("get_students_by_course.php", (call) => ({
		json: studentsByCourse[call.query.courseId ?? ""] ?? [],
		delayMs: call.query.courseId === "2" ? 600 : 0,
	}));
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	await app.page
		.getByLabel("Course", { exact: true })
		.selectOption({ label: "ENGR 297" });
	await expect(studentPicker(app)).toHaveValue("", { timeout: 150 });
});

test("says the students are loading until they arrive", async ({ app }) => {
	app.backend.reply("get_students_by_course.php", {
		json: studentsByCourse["1"],
		delayMs: 400,
	});
	await app.page
		.getByLabel("Course", { exact: true })
		.selectOption({ label: "CMPE 235" });
	await expect(studentPicker(app).locator("option").first()).toHaveText(
		"Loading students…",
	);
	await expect(studentItems(app.page)).toHaveCount(2);
	await expect(studentPicker(app).locator("option").first()).toHaveText(
		"Select a student",
	);
});

test("ignores a late reply for a course that is no longer chosen", async ({
	app,
}) => {
	app.backend.reply("get_students_by_course.php", (call) => ({
		json: studentsByCourse[call.query.courseId ?? ""] ?? [],
		delayMs: call.query.courseId === "1" ? 500 : 0,
	}));
	await chooseCourse(app.page, "CMPE 235");
	await chooseCourse(app.page, "ENGR 297");
	await expect(studentItems(app.page)).toHaveText(["Grace Hopper"]);
	await app.idle();
	await new Promise((resolve) => setTimeout(resolve, 700));
	await expect(studentItems(app.page)).toHaveText(["Grace Hopper"]);
});

test("says so when the students cannot be loaded", async ({ app }) => {
	app.backend.reply("get_students_by_course.php", { status: 500 });
	await chooseCourse(app.page, "CMPE 235");
	await expect(
		app.page.getByText("The students could not be loaded."),
	).toBeVisible();
	await expect(studentItems(app.page)).toHaveCount(0);
});

test("reports a failed computation", async ({ app }) => {
	app.backend.reply("compute_and_save_grade.php", { status: 500 });
	await computeForStudent(app);
	await expect(app.page.getByRole("alert")).toHaveText(
		"The grade could not be computed. Try again.",
	);
});

test("forgets an old result when computing a new one", async ({ app }) => {
	await computeForStudent(app);
	await expect(app.page.getByRole("status")).toContainText("Computed grade B");
	app.backend.reply("compute_and_save_grade.php", { status: 500 });
	await compute(app);
	await expect(app.page.getByRole("alert")).toBeVisible();
	await expect(app.page.locator(".result")).toBeEmpty();
});

test("shows markup in the computed grade as plain text", async ({ app }) => {
	const grade = '<img src=x onerror="window.__xss=1">';
	app.backend.reply("compute_and_save_grade.php", {
		json: { grade, percentage: "1", totalMarks: "1" },
	});
	await computeForStudent(app);
	const result = app.page.getByRole("status");
	await expect(result).toContainText(grade);
	await expect(result.locator("img")).toHaveCount(0);
});

// Student names are text, whatever they contain.
test("shows markup in a student name as plain text", async ({ app }) => {
	const first = '</option></select><img src=x onerror="window.__xss=1">';
	app.backend.reply("get_students_by_course.php", {
		json: [{ ID: "7", FirstName: first, LastName: "Lovelace" }],
	});
	await chooseCourse(app.page, "CMPE 235");
	await expect(studentItems(app.page)).toHaveText(`${first} Lovelace`);
	await expect(studentItems(app.page).locator("*")).toHaveCount(0);
});

test("leaves window.print alone", async ({ app }) => {
	const native = await app.page.evaluate(() =>
		String(window.print).includes("[native code]"),
	);
	expect(native).toBe(true);
});

test("does not log the form values when a button is pressed", async ({
	app,
}) => {
	await compute(app);
	await app.idle();
	expect(app.consoleLogs.some((line) => line.startsWith("courseId="))).toBe(
		false,
	);
});
