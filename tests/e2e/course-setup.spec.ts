import { type App, expect, test } from "../support/app";
import { chooseCourse, courseItems } from "../support/screens";

const categories = [
	"Homework",
	"Labs",
	"Project",
	"Presentation",
	"Midterm",
	"Final",
];

const gradeScale: Record<string, [number, number]> = {
	A: [90, 100],
	B: [80, 89],
	C: [70, 79],
	D: [60, 69],
	F: [0, 59],
};

/** What is typed into a form, by label, and what the server should then get. */
interface SetupPage {
	path: string;
	endpoint: string;
	save: string;
	saved: string;
	refused: string;
	entries: Record<string, string>;
	fields: Record<string, string[]>;
}

const weights = [20, 20, 20, 10, 15, 15];

const setupPages: SetupPage[] = [
	{
		path: "set.html",
		endpoint: "save_marks_setting.php",
		save: "Save marks",
		saved: "Marks saved.",
		refused: "The marks could not be saved. Try again.",
		entries: Object.fromEntries(categories.map((name) => [name, "60"])),
		fields: Object.fromEntries(categories.map((name) => [`M${name}`, ["60"]])),
	},
	{
		path: "set1.html",
		endpoint: "save_percentage_setting.php",
		save: "Save weights",
		saved: "Weights saved.",
		refused: "The weights were not saved. They have to add up to 100.",
		entries: Object.fromEntries(
			categories.map((name, i) => [`${name} (%)`, String(weights[i])]),
		),
		fields: Object.fromEntries(
			categories.map((name, i) => [`P${name}`, [String(weights[i])]]),
		),
	},
	{
		path: "set2.html",
		endpoint: "save_grade_setting.php",
		save: "Save scale",
		saved: "Grade scale saved.",
		refused: "The grade scale could not be saved. Try again.",
		entries: Object.fromEntries(
			Object.entries(gradeScale).flatMap(([grade, [from, to]]) => [
				[`${grade} from`, String(from)],
				[`${grade} to`, String(to)],
			]),
		),
		fields: Object.fromEntries(
			Object.entries(gradeScale).flatMap(([grade, [from, to]]) => [
				[`${grade}RangeStart`, [String(from)]],
				[`${grade}RangeEnd`, [String(to)]],
			]),
		),
	},
];

async function fill(app: App, entries: Record<string, string>): Promise<void> {
	for (const [label, value] of Object.entries(entries)) {
		await app.page.getByLabel(label, { exact: true }).fill(value);
	}
}

const saveButton = (app: App, name: string) =>
	app.page.getByRole("button", { name });

for (const setup of setupPages) {
	test.describe(setup.path, () => {
		test("loads the course list when the page opens", async ({ app }) => {
			await app.open(setup.path);
			const [call] = app.backend.callsTo("get_course.php");
			expect(app.backend.callsTo("get_course.php")).toHaveLength(1);
			expect(call?.method).toBe("GET");
			await expect(courseItems(app.page)).toHaveText(["CMPE 235", "ENGR 297"]);
		});

		test("saves the form for the chosen course", async ({ app }) => {
			await app.open(setup.path);
			await chooseCourse(app.page, "ENGR 297");
			await fill(app, setup.entries);
			await saveButton(app, setup.save).click();
			await expect
				.poll(() => app.backend.callsTo(setup.endpoint))
				.toHaveLength(1);
			const [call] = app.backend.callsTo(setup.endpoint);
			expect(call?.method).toBe("POST");
			expect(call?.form).toEqual({ courseId: ["2"], ...setup.fields });
			await expect(app.page.getByRole("status")).toHaveText(setup.saved);
		});

		test("asks for a course instead of saving when none is chosen", async ({
			app,
		}) => {
			await app.open(setup.path);
			await fill(app, setup.entries);
			await saveButton(app, setup.save).click();
			await expect(app.page.getByRole("alert").getByRole("link")).toHaveText([
				"Choose a course",
			]);
			await app.idle();
			expect(app.backend.callsTo(setup.endpoint)).toHaveLength(0);
		});

		test("asks for every value instead of saving an empty form", async ({
			app,
		}) => {
			await app.open(setup.path);
			await saveButton(app, setup.save).click();
			const links = app.page.getByRole("alert").getByRole("link");
			await expect(links).toHaveCount(1 + Object.keys(setup.entries).length);
			await expect(links.first()).toHaveText("Choose a course");
			await app.idle();
			expect(app.backend.callsTo(setup.endpoint)).toHaveLength(0);
		});

		test("says so when the save is refused, and keeps what was typed", async ({
			app,
		}) => {
			app.backend.reply(setup.endpoint, { status: 500 });
			await app.open(setup.path);
			await chooseCourse(app.page, "CMPE 235");
			await fill(app, setup.entries);
			await saveButton(app, setup.save).click();
			await expect(app.page.getByRole("alert")).toHaveText(setup.refused);
			const [label, value] = Object.entries(setup.entries)[0] ?? [];
			await expect(
				app.page.getByLabel(label ?? "", { exact: true }),
			).toHaveValue(value ?? "");
		});

		test("says the server could not be reached when the network fails", async ({
			app,
		}) => {
			app.backend.reply(setup.endpoint, { abort: true });
			await app.open(setup.path);
			await chooseCourse(app.page, "CMPE 235");
			await fill(app, setup.entries);
			await saveButton(app, setup.save).click();
			await expect(app.page.getByRole("alert")).toContainText(
				"could not be reached",
			);
		});

		// The page does not read the reply to a save, so a 200 that is not JSON
		// counts as saved.
		test("counts any successful reply as saved", async ({ app }) => {
			app.backend.reply(setup.endpoint, { text: "OK" });
			await app.open(setup.path);
			await chooseCourse(app.page, "CMPE 235");
			await fill(app, setup.entries);
			await saveButton(app, setup.save).click();
			await expect(app.page.getByRole("status")).toHaveText(setup.saved);
		});

		test("says the courses could not be loaded, and tries again on request", async ({
			app,
		}) => {
			app.backend.reply("get_course.php", { status: 500 });
			await app.open(setup.path);
			await expect(app.page.getByRole("alert")).toContainText(
				"The courses could not be loaded.",
			);
			await expect(saveButton(app, setup.save)).toHaveCount(0);
			app.backend.reply("get_course.php", {
				json: [{ ID: "1", CourseName: "CMPE 235" }],
			});
			await app.page.getByRole("button", { name: "Try again" }).click();
			await expect(saveButton(app, setup.save)).toBeVisible();
			await expect(courseItems(app.page)).toHaveText(["CMPE 235"]);
		});

		test("says there are no courses, and offers no form, when the list is empty", async ({
			app,
		}) => {
			app.backend.reply("get_course.php", { json: [] });
			await app.open(setup.path);
			await expect(
				app.page.getByText("There are no courses yet."),
			).toBeVisible();
			await expect(
				app.page.getByRole("link", { name: "Add one on the home page." }),
			).toHaveAttribute("href", "prohome.html");
			await expect(saveButton(app, setup.save)).toHaveCount(0);
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

test("set.html says it is loading until the courses arrive", async ({
	app,
}) => {
	app.backend.reply("get_course.php", {
		json: [{ ID: "1", CourseName: "CMPE 235" }],
		delayMs: 400,
	});
	await app.page.goto("/set.html");
	await expect(app.page.getByRole("status")).toHaveText("Loading courses…");
	await expect(app.page.locator("main")).toHaveAttribute("aria-busy", "true");
	await expect(courseItems(app.page)).toHaveCount(1);
	await expect(app.page.locator("main")).not.toHaveAttribute(
		"aria-busy",
		"true",
	);
});

test.describe("set.html", () => {
	test("posts a changed mark", async ({ app }) => {
		await app.open("set.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, { ...setupPages[0]?.entries, Homework: "75" });
		await saveButton(app, "Save marks").click();
		await expect
			.poll(() => app.backend.callsTo("save_marks_setting.php"))
			.toHaveLength(1);
		expect(
			app.backend.callsTo("save_marks_setting.php")[0]?.form.MHomework,
		).toEqual(["75"]);
	});

	// Known issue B11: marks may go up to 500 here but grading stops at 100.
	test("accepts a mark up to 500 and refuses one above it", async ({ app }) => {
		await app.open("set.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, { ...setupPages[0]?.entries, Homework: "501" });
		await saveButton(app, "Save marks").click();
		await expect(app.page.getByRole("alert")).toContainText(
			"Homework must be between 0 and 500",
		);
		expect(app.backend.callsTo("save_marks_setting.php")).toHaveLength(0);
		await app.page.getByLabel("Homework", { exact: true }).fill("500");
		await saveButton(app, "Save marks").click();
		await expect
			.poll(() => app.backend.callsTo("save_marks_setting.php"))
			.toHaveLength(1);
	});
});

test.describe("set1.html", () => {
	test("refuses weights that do not total 100 and sends nothing", async ({
		app,
	}) => {
		await app.open("set1.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, { ...setupPages[1]?.entries, "Final (%)": "20" });
		await saveButton(app, "Save weights").click();
		await expect(app.page.getByRole("alert")).toContainText(
			"The weights must add up to 100. They add up to 105.",
		);
		expect(app.backend.callsTo("save_percentage_setting.php")).toHaveLength(0);
	});

	test("accepts weights with decimals that total 100", async ({ app }) => {
		await app.open("set1.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, {
			"Homework (%)": "33.3",
			"Labs (%)": "33.3",
			"Project (%)": "33.4",
			"Presentation (%)": "0",
			"Midterm (%)": "0",
			"Final (%)": "0",
		});
		await saveButton(app, "Save weights").click();
		await expect(app.page.getByRole("status")).toHaveText("Weights saved.");
	});

	test("refuses a weight above 100", async ({ app }) => {
		await app.open("set1.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, { ...setupPages[1]?.entries, "Homework (%)": "101" });
		await saveButton(app, "Save weights").click();
		await expect(app.page.getByRole("alert")).toContainText(
			"Homework (%) must be between 0 and 100",
		);
	});
});

test.describe("set2.html", () => {
	test("refuses ranges that overlap and sends nothing", async ({ app }) => {
		await app.open("set2.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, { ...setupPages[2]?.entries, "B to": "95" });
		await saveButton(app, "Save scale").click();
		await expect(app.page.getByRole("alert")).toContainText(
			"Grade ranges must not overlap: A and B do",
		);
		expect(app.backend.callsTo("save_grade_setting.php")).toHaveLength(0);
	});

	test("refuses ranges that share an edge", async ({ app }) => {
		await app.open("set2.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, { ...setupPages[2]?.entries, "B to": "90" });
		await saveButton(app, "Save scale").click();
		await expect(app.page.getByRole("alert")).toContainText(
			"Grade ranges must not overlap: A and B do",
		);
		expect(app.backend.callsTo("save_grade_setting.php")).toHaveLength(0);
	});

	test("refuses a range that ends before it starts", async ({ app }) => {
		await app.open("set2.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, {
			...setupPages[2]?.entries,
			"C from": "79",
			"C to": "70",
		});
		await saveButton(app, "Save scale").click();
		await expect(app.page.getByRole("alert")).toContainText(
			"C must end at or after it starts",
		);
		expect(app.backend.callsTo("save_grade_setting.php")).toHaveLength(0);
	});

	test("lets the ranges be given in any order of size, so long as they do not overlap", async ({
		app,
	}) => {
		await app.open("set2.html");
		await chooseCourse(app.page, "CMPE 235");
		await fill(app, {
			"A from": "0",
			"A to": "9",
			"B from": "10",
			"B to": "19",
			"C from": "20",
			"C to": "29",
			"D from": "30",
			"D to": "39",
			"F from": "40",
			"F to": "100",
		});
		await saveButton(app, "Save scale").click();
		await expect(app.page.getByRole("status")).toHaveText("Grade scale saved.");
	});
});
