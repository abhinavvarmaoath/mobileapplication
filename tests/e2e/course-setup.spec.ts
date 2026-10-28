import { type App, expect, test } from "../support/app";
import { chooseCourse, openSettings } from "../support/screens";

interface SetupPage {
	path: string;
	endpoint: string;
	courseField: string;
	status: string;
	fields: Record<string, string[]>;
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

const gradeRanges = Object.fromEntries(
	["A", "B", "C", "D", "F"].flatMap((grade) => [
		[`${grade}RangeStart`, ["0"]],
		[`${grade}RangeEnd`, ["100"]],
	]),
);

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
	},
];

async function save(app: App): Promise<void> {
	await openSettings(app.page);
	await app.page.locator("#gr button[type=submit]").click();
}

for (const setup of setupPages) {
	test.describe(setup.path, () => {
		test("loads the course list when the page opens", async ({ app }) => {
			await app.open(setup.path);
			await app.idle();
			const [call] = app.backend.callsTo("get_course.php");
			expect(app.backend.callsTo("get_course.php")).toHaveLength(1);
			expect(call?.method).toBe("GET");
			await expect(app.page.locator("#course .dropdown-item")).toHaveText([
				"CMPE 235",
				"ENGR 297",
			]);
		});

		test("fills the hidden course id from the chosen course", async ({
			app,
		}) => {
			await app.open(setup.path);
			await chooseCourse(app.page, "ENGR 297");
			await expect(app.page.locator(setup.courseField)).toHaveValue("2");
		});

		test("saves the defaults for the chosen course", async ({ app }) => {
			await app.open(setup.path);
			await chooseCourse(app.page, "ENGR 297");
			await save(app);
			await expect
				.poll(() => app.backend.callsTo(setup.endpoint))
				.toHaveLength(1);
			const [call] = app.backend.callsTo(setup.endpoint);
			expect(call?.method).toBe("POST");
			expect(call?.form).toEqual({ courseId: ["2"], ...setup.fields });
		});

		// Known bug B3: nothing stops a save before a course is chosen.
		test("saves with an empty course id when no course is chosen", async ({
			app,
		}) => {
			await app.open(setup.path);
			await save(app);
			await expect
				.poll(() => app.backend.callsTo(setup.endpoint))
				.toHaveLength(1);
			expect(app.backend.callsTo(setup.endpoint)[0]?.form.courseId).toEqual([
				"",
			]);
		});

		// Known bug S2: course names are inserted into the page as HTML. The
		// payload runs whether it lands in a link or in a select.
		test("runs script hidden in a course name", async ({ app }) => {
			app.backend.reply("get_course.php", {
				json: [
					{
						ID: "1",
						CourseName:
							'</option></select><img src=x onerror="window.__xss=1">Injected',
					},
				],
			});
			await app.open(setup.path);
			await expect
				.poll(() =>
					app.page.evaluate(
						() => (window as unknown as { __xss?: number }).__xss,
					),
				)
				.toBe(1);
		});
	});
}

test.describe("set.html messages", () => {
	test("posts a changed mark", async ({ app }) => {
		await app.open("set.html");
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
		await save(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
			"Marks saved successfully",
		);
	});

	// Known bug B2: the error handler reports success.
	test("reports success after a failed save", async ({ app }) => {
		app.backend.reply("save_marks_setting.php", { status: 500 });
		await app.open("set.html");
		await save(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
			"Marks saved successfully",
		);
	});
});

test.describe("set1.html messages", () => {
	const saved = "Scaling Factors saved successfully";
	const refused = "Scaling Factors cannot be saved. It has to total to 100%";

	test("reports success after a save", async ({ app }) => {
		await app.open("set1.html");
		await save(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(saved);
	});

	test("blames the 100% total when the server refuses", async ({ app }) => {
		app.backend.reply("save_percentage_setting.php", { status: 500 });
		await app.open("set1.html");
		await save(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(refused);
	});

	// Known bug B2: a dropped connection gets the same explanation.
	test("blames the 100% total when the network fails", async ({ app }) => {
		app.backend.reply("save_percentage_setting.php", { abort: true });
		await app.open("set1.html");
		await save(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(refused);
	});

	// Known bug B2: a 200 reply that is not JSON counts as a save.
	test("reports success when the reply is not JSON", async ({ app }) => {
		app.backend.reply("save_percentage_setting.php", { text: "OK" });
		await app.open("set1.html");
		await save(app);
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(saved);
	});
});

test.describe("set2.html messages", () => {
	test("reports success after a save", async ({ app }) => {
		await app.open("set2.html");
		await save(app);
		await expect(app.page.locator("#gcSaveStatus")).toHaveText(
			"Grade Settings Saved",
		);
	});

	// Known bug B2: there is no error handler, so a failure is silent.
	test("says nothing after a failed save", async ({ app }) => {
		app.backend.reply("save_grade_setting.php", { status: 500 });
		await app.open("set2.html");
		await save(app);
		await app.idle();
		await expect(app.page.locator("#gcSaveStatus")).toHaveText("");
	});
});
