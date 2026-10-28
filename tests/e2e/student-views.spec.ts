import { expect, test } from "../support/app";
import { localSite, studentGrades } from "../support/data";

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
		await expect(
			app.page.locator('[data-role="collapsible"] h3'),
		).toContainText("WHO IS MY PROFESSOR?");
	});

	// Known bug B9: the link only works on the original developer's machine.
	test("logs out through an absolute local file path", async ({ app }) => {
		await expect(app.page.locator("a", { hasText: "Logout" })).toHaveAttribute(
			"href",
			`${localSite}index.html`,
		);
	});
});

test.describe("grade estimator", () => {
	test.beforeEach(async ({ app }) => {
		await app.open("viewGrades.html");
	});

	// Known bug B10: the page always acts for student 1 in course 1.
	test("uses a fixed student and course", async ({ app }) => {
		await expect(app.page.locator("#CourseId")).toHaveValue("1");
		await expect(app.page.locator("#StudentId")).toHaveValue("1");
	});

	test("posts the marks and shows the estimate", async ({ app }) => {
		await app.page.getByRole("button", { name: "COMPUTE GRADE" }).click();
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
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText(
			"Estimated Grade is :B Percentage :81",
			{ useInnerText: true },
		);
	});

	test("links to the grades list", async ({ app }) => {
		await expect(
			app.page.locator("a", { hasText: "View Grades" }),
		).toHaveAttribute("href", "grades.html");
	});

	// Known bug B2: there is no error handler, so a failure is silent.
	test("says nothing when the estimate fails", async ({ app }) => {
		app.backend.reply("computegradestudent.php", { status: 500 });
		await app.page.getByRole("button", { name: "COMPUTE GRADE" }).click();
		await app.idle();
		await expect(app.page.locator("#totalMarksSaveStatus")).toHaveText("");
	});

	// Known bug S2: the estimate is inserted as HTML.
	test("runs script hidden in the estimate", async ({ app }) => {
		app.backend.reply("computegradestudent.php", {
			json: { grade: '<img src=x onerror="window.__xss=1">', percentage: "1" },
		});
		await app.page.getByRole("button", { name: "COMPUTE GRADE" }).click();
		await expect
			.poll(() =>
				app.page.evaluate(
					() => (window as unknown as { __xss?: number }).__xss,
				),
			)
			.toBe(1);
	});

	// Known bug B8: the page replaces window.print and logs the form on every click.
	test("replaces window.print and logs the form values", async ({ app }) => {
		const native = await app.page.evaluate(() =>
			String(window.print).includes("[native code]"),
		);
		expect(native).toBe(false);
		await app.page.getByRole("button", { name: "COMPUTE GRADE" }).click();
		await expect
			.poll(() => app.consoleLogs.some((line) => line.startsWith("courseId=")))
			.toBe(true);
	});
});

test.describe("grades list", () => {
	const spans: Record<string, keyof typeof studentGrades> = {
		"#finalHomeworks": "Homework",
		"#finalLabs": "Labs",
		"#finalProject": "Project",
		"#finalPresentation": "Presentation",
		"#finalMidterm": "Midterm",
		"#final": "Final",
		"#finalGrade": "Grade",
	};

	// Known bug B10: the request carries no student or course.
	test("asks for the grades without saying whose", async ({ app }) => {
		await app.open("grades.html");
		await app.idle();
		const [call] = app.backend.callsTo("student.php");
		expect(app.backend.callsTo("student.php")).toHaveLength(1);
		expect(call?.method).toBe("GET");
		expect(call?.query).toEqual({});
		expect(call?.form).toEqual({});
	});

	test("shows each grade in its own place", async ({ app }) => {
		await app.open("grades.html");
		for (const [selector, key] of Object.entries(spans)) {
			await expect(app.page.locator(selector)).toHaveText(studentGrades[key]);
		}
	});

	test("keeps the placeholders when the request fails", async ({ app }) => {
		app.backend.reply("student.php", { status: 500 });
		await app.open("grades.html");
		await app.idle();
		await expect(app.page.locator("#finalGrade")).toHaveText("TBD");
		await expect(app.page.locator("#finalLabs")).toHaveText("TBD");
	});

	// Known bug S2: the grades are inserted as HTML.
	test("runs script hidden in a grade", async ({ app }) => {
		app.backend.reply("student.php", {
			json: {
				...studentGrades,
				Homework: '<img src=x onerror="window.__xss=1">',
			},
		});
		await app.open("grades.html");
		await expect
			.poll(() =>
				app.page.evaluate(
					() => (window as unknown as { __xss?: number }).__xss,
				),
			)
			.toBe(1);
	});
});
