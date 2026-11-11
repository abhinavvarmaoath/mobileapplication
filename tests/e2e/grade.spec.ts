import { type App, expect, test } from "../support/app";
import { studentsByCourse } from "../support/data";
import {
	chooseCourse,
	chooseStudent,
	openSettings,
	studentItems,
} from "../support/screens";

const marks = Object.fromEntries(
	["Homework", "Labs", "Project", "Presentation", "Midterm", "Final"].map(
		(category) => [`M${category}`, ["60"]],
	),
);

async function compute(app: App): Promise<void> {
	await openSettings(app.page);
	await app.page.locator("#gr button[type=submit]").click();
}

async function computeForStudent(app: App): Promise<void> {
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
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

test("asks for a course and a student instead of computing", async ({
	app,
}) => {
	await compute(app);
	await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
		"Choose a course and a student first.",
	);
	expect(app.backend.callsTo("compute_and_save_grade.php")).toHaveLength(0);
});

test("asks for a student when only a course is chosen", async ({ app }) => {
	await chooseCourse(app.page, "CMPE 235");
	await compute(app);
	await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
		"Choose a course and a student first.",
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
	await expect(app.page.locator("#StudentId")).toHaveValue("7");
	await chooseCourse(app.page, "ENGR 297");
	await expect(app.page.locator("#StudentId")).toHaveValue("");
	await expect(app.page.locator("#student")).toHaveValue("");
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
	await expect(studentItems(app.page)).toHaveText(["Grace Hopper"]);
});

test("reports a failed computation", async ({ app }) => {
	app.backend.reply("compute_and_save_grade.php", { status: 500 });
	await computeForStudent(app);
	await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
		"The grade could not be computed. Please try again.",
	);
});

// Known bug S2: the grade is inserted as HTML.
test("runs script hidden in the computed grade", async ({ app }) => {
	app.backend.reply("compute_and_save_grade.php", {
		json: {
			grade: '<img src=x onerror="window.__xss=1">',
			percentage: "1",
			totalMarks: "1",
		},
	});
	await computeForStudent(app);
	await expect
		.poll(() =>
			app.page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
		)
		.toBe(1);
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
