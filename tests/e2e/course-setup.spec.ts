import type { Page } from "@playwright/test";
import { type App, expect, test } from "../support/app";
import { chooseCourse, courseItems, openSettings } from "../support/screens";

interface SetupPage {
	path: string;
	endpoint: string;
	courseField: string;
	status: string;
	fields: Record<string, string[]>;
	/** Puts the form into a state that can be saved. */
	prepare?: (page: Page) => Promise<void>;
}

const categories = [
	"Homework",
	"Labs",
	"Project",
	"Presentation",
	"Midterm",
	"Final",
];

function perCategory(prefix: string): Record<string, string[]> {
	return Object.fromEntries(categories.map((c) => [`${prefix}${c}`, ["60"]]));
}

const gradeScale: Record<string, [number, number]> = {
	A: [90, 100],
	B: [80, 89],
	C: [70, 79],
	D: [60, 69],
	F: [0, 59],
};

const gradeRanges = Object.fromEntries(
	Object.entries(gradeScale).flatMap(([grade, [start, end]]) => [
		[`${grade}RangeStart`, [String(start)]],
		[`${grade}RangeEnd`, [String(end)]],
	]),
);

async function setRanges(
	page: Page,
	ranges: Record<string, [number, number]>,
): Promise<void> {
	await openSettings(page);
	for (const [grade, [start, end]] of Object.entries(ranges)) {
		await page.locator(`#${grade}RangeStart`).fill(String(start));
		await page.locator(`#${grade}RangeEnd`).fill(String(end));
	}
}

function setGradeScale(page: Page): Promise<void> {
	return setRanges(page, gradeScale);
}

const setupPages: SetupPage[] = [
	{
		path: "set.html",
		endpoint: "save_marks_setting.php",
		courseField: "#CourseId",
		status: "#totalMarksSaveStatus",
		fields: perCategory("M"),
	},
	{
		path: "set1.html",
		endpoint: "save_percentage_setting.php",
		courseField: "#CourseId",
		status: "#totalMarksSaveStatus",
		fields: perCategory("P"),
	},
	{
		path: "set2.html",
		endpoint: "save_grade_setting.php",
		courseField: "#courseId",
		status: "#gcSaveStatus",
		fields: gradeRanges,
		prepare: setGradeScale,
	},
];

async function save(app: App): Promise<void> {
	await openSettings(app.page);
	await app.page.locator("#gr button[type=submit]").click();
}

async function saveForCourse(app: App): Promise<void> {
	await chooseCourse(app.page, "CMPE 235");
	await save(app);
}

async function saveWithScale(app: App): Promise<void> {
	await chooseCourse(app.page, "CMPE 235");
	await setGradeScale(app.page);
	await save(app);
}

for (const setup of setupPages) {
	test.describe(setup.path, () => {
		test("loads the course list when the page opens", async ({ app }) => {
			await app.open(setup.path);
			await app.idle();
			const [call] = app.backend.callsTo("get_course.php");
			expect(app.backend.callsTo("get_course.php")).toHaveLength(1);
			expect(call?.method).toBe("GET");
			await expect(courseItems(app.page)).toHaveText(["CMPE 235", "ENGR 297"]);
		});

		test("fills the hidden course id from the chosen course", async ({
			app,
		}) => {
			await app.open(setup.path);
			await chooseCourse(app.page, "ENGR 297");
			await expect(app.page.locator(setup.courseField)).toHaveValue("2");
		});

		test("saves the form for the chosen course", async ({ app }) => {
			await app.open(setup.path);
			await chooseCourse(app.page, "ENGR 297");
			await setup.prepare?.(app.page);
			await save(app);
			await expect
				.poll(() => app.backend.callsTo(setup.endpoint))
				.toHaveLength(1);
			const [call] = app.backend.callsTo(setup.endpoint);
			expect(call?.method).toBe("POST");
			expect(call?.form).toEqual({ courseId: ["2"], ...setup.fields });
		});

		test("asks for a course instead of saving when none is chosen", async ({
			app,
		}) => {
			await app.open(setup.path);
			await save(app);
			await expect(app.page.locator(setup.status)).toHaveText(
				"Choose a course first.",
			);
			expect(app.backend.callsTo(setup.endpoint)).toHaveLength(0);
		});

		// Course names are text, whatever they contain.
		test("shows markup in a course name as plain text", async ({ app }) => {
			const name =
				'</option></select><img src=x onerror="window.__xss=1">Injected';
			app.backend.reply("get_course.php", {
				json: [{ ID: "1", CourseName: name }],
			});
			await app.open(setup.path);
			await expect(courseItems(app.page)).toHaveText(name);
			await expect(courseItems(app.page).locator("*")).toHaveCount(0);
		});
	});
}

test.describe("set.html messages", () => {
	test("posts a changed mark", async ({ app }) => {
		await app.open("set.html");
		await chooseCourse(app.page, "CMPE 235");
		await openSettings(app.page);
		await app.page.locator("#MHomework").fill("75");
		await app.page.locator("#gr button[type=submit]").click();
		await expect
			.poll(() => app.backend.callsTo("save_marks_setting.php"))
			.toHaveLength(1);
		expect(
			app.backend.callsTo("save_marks_setting.php")[0]?.form.MHomework,
		).toEqual(["75"]);
	});

	test("reports success after a save", async ({ app }) => {
		await app.open("set.html");
		await saveForCourse(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
			"Marks saved successfully",
		);
	});

	test("reports a failed save", async ({ app }) => {
		app.backend.reply("save_marks_setting.php", { status: 500 });
		await app.open("set.html");
		await saveForCourse(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
			"Marks could not be saved. Please try again.",
		);
	});
});

test.describe("set1.html messages", () => {
	const saved = "Scaling Factors saved successfully";
	const refused = "Scaling Factors cannot be saved. It has to total to 100%";

	test("reports success after a save", async ({ app }) => {
		await app.open("set1.html");
		await saveForCourse(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(saved);
	});

	test("blames the 100% total when the server refuses", async ({ app }) => {
		app.backend.reply("save_percentage_setting.php", { status: 500 });
		await app.open("set1.html");
		await saveForCourse(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(refused);
	});

	test("says the server could not be reached when the network fails", async ({
		app,
	}) => {
		app.backend.reply("save_percentage_setting.php", { abort: true });
		await app.open("set1.html");
		await saveForCourse(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
			"Could not reach the server. Please try again.",
		);
	});

	// The page treats a 200 reply it cannot parse as a save; kept as it was.
	test("reports success when the reply is not JSON", async ({ app }) => {
		app.backend.reply("save_percentage_setting.php", { text: "OK" });
		await app.open("set1.html");
		await saveForCourse(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(saved);
	});
});

test.describe("set2.html messages", () => {
	test("reports success after a save", async ({ app }) => {
		await app.open("set2.html");
		await saveWithScale(app);
		await expect(app.page.locator("#gcSaveStatus")).toHaveText(
			"Grade Settings Saved",
		);
	});

	test("reports a failed save", async ({ app }) => {
		app.backend.reply("save_grade_setting.php", { status: 500 });
		await app.open("set2.html");
		await saveWithScale(app);
		await expect(app.page.locator("#gcSaveStatus")).toHaveText(
			"Grade settings could not be saved. Please try again.",
		);
	});

	test("refuses ranges that overlap and sends nothing", async ({ app }) => {
		await app.open("set2.html");
		await saveForCourse(app);
		await expect(app.page.locator("#gcSaveStatus")).toHaveText(
			"Grade ranges must not overlap.",
		);
		expect(app.backend.callsTo("save_grade_setting.php")).toHaveLength(0);
	});

	test("refuses ranges that share an edge", async ({ app }) => {
		await app.open("set2.html");
		await chooseCourse(app.page, "CMPE 235");
		await setRanges(app.page, { ...gradeScale, B: [80, 90] });
		await save(app);
		await expect(app.page.locator("#gcSaveStatus")).toHaveText(
			"Grade ranges must not overlap.",
		);
		expect(app.backend.callsTo("save_grade_setting.php")).toHaveLength(0);
	});
});
