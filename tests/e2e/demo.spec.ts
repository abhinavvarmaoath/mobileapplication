import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig } from "../../tools/config.mjs";
import { metaPattern, policyFor, withPolicy } from "../../tools/csp.mjs";
import { type App, expect, test } from "../support/app";
import { useConfig } from "../support/config";
import { pages } from "../support/pages";
import {
	chooseCourse,
	chooseStudent,
	courseItems,
	studentItems,
} from "../support/screens";

const categories = [
	"Homework",
	"Labs",
	"Project",
	"Presentation",
	"Midterm",
	"Final",
];

async function setMarks(
	app: App,
	values: Record<string, number>,
): Promise<void> {
	for (const name of categories) {
		await app.page
			.getByLabel(name, { exact: true })
			.fill(String(values[name] ?? 0));
	}
}

async function computeGrade(app: App): Promise<void> {
	await app.page.getByRole("button", { name: "Compute grade" }).click();
}

async function setWeights(
	app: App,
	values: Record<string, number>,
): Promise<void> {
	for (const name of categories) {
		await app.page
			.getByLabel(`${name} (%)`, { exact: true })
			.fill(String(values[name] ?? 0));
	}
}

async function saveWeights(app: App): Promise<void> {
	await app.page.getByRole("button", { name: "Save weights" }).click();
}

test.describe("demo mode", () => {
	test.beforeEach(async ({ app }) => {
		await useConfig(app.page, { demo: true });
	});

	test.afterEach(({ app }) => {
		expect(app.backend.hosts, "hosts contacted").toEqual([]);
		expect(app.backend.calls, "calls to the backend").toEqual([]);
	});

	for (const [account, home] of [
		["professor", "prohome.html"],
		["student", "stuhome.html"],
	] as const) {
		test(`logs a ${account} in and opens their home page`, async ({ app }) => {
			await app.open("index.html");
			await app.page.getByLabel("Username", { exact: true }).fill("ada");
			await app.page.getByLabel("Password", { exact: true }).fill("secret");
			await app.page
				.getByRole("radio", {
					name: account === "professor" ? "Professor" : "Student",
				})
				.check();
			await app.page.getByRole("button", { name: "Login" }).click();
			await expect(app.page).toHaveURL(new RegExp(`/${home}$`));
		});
	}

	test("lists the courses and the students of a course", async ({ app }) => {
		await app.open("grade.html");
		await expect(courseItems(app.page)).toHaveText(["CMPE 235", "ENGR 297"]);
		await chooseCourse(app.page, "CMPE 235");
		await expect(studentItems(app.page)).toHaveText([
			"Ada Lovelace",
			"Alan Turing",
		]);
	});

	test("shows a class that was added in the course lists", async ({ app }) => {
		await app.open("prohome.html");
		await app.page.getByLabel("Class number", { exact: true }).fill("CS 101");
		await app.page.getByLabel("Description", { exact: true }).fill("Intro");
		await app.page.getByRole("button", { name: "Add class" }).click();
		await expect(app.page.getByRole("status")).toHaveText("Class added.");

		await app.open("set.html");
		await expect(courseItems(app.page)).toHaveText([
			"CMPE 235",
			"ENGR 297",
			"CS 101",
		]);
	});

	// The page checks the total before sending; the demo backend's own refusal
	// is covered by its unit tests.
	test("refuses weights that do not total 100 and accepts ones that do", async ({
		app,
	}) => {
		await app.open("set1.html");
		await chooseCourse(app.page, "CMPE 235");
		await setWeights(app, { Homework: 60, Labs: 60 });
		await saveWeights(app);
		await expect(app.page.getByRole("alert")).toContainText(
			"The weights must add up to 100",
		);

		await setWeights(app, { Homework: 100 });
		await saveWeights(app);
		await expect(app.page.getByRole("status")).toHaveText("Weights saved.");
	});

	test("grades with the course's saved percentages", async ({ app }) => {
		await app.open("set1.html");
		await chooseCourse(app.page, "CMPE 235");
		await setWeights(app, { Homework: 100 });
		await saveWeights(app);
		await expect(app.page.getByRole("status")).toHaveText("Weights saved.");

		await app.open("grade.html");
		await chooseCourse(app.page, "CMPE 235");
		await chooseStudent(app.page, "Ada Lovelace");
		await setMarks(app, { Homework: 80 });
		await computeGrade(app);
		const result = app.page.getByRole("status");
		await expect(result).toContainText("Computed grade B");
		await expect(result).toContainText("Percentage 80");
		await expect(result).toContainText("Marks 80");
	});

	test("grades with the default percentages and ranges when none are saved", async ({
		app,
	}) => {
		await app.open("grade.html");
		await chooseCourse(app.page, "CMPE 235");
		await chooseStudent(app.page, "Ada Lovelace");
		await setMarks(
			app,
			Object.fromEntries(categories.map((name) => [name, 60])),
		);
		await computeGrade(app);
		const result = app.page.getByRole("status");
		await expect(result).toContainText("Computed grade D");
		await expect(result).toContainText("Percentage 60");
		await expect(result).toContainText("Marks 360");
	});

	test("shows a student's grades", async ({ app }) => {
		await app.open("grades.html");
		await expect(app.page.getByRole("definition")).toHaveText([
			"90",
			"80",
			"70",
			"60",
			"50",
			"40",
			"B",
		]);
	});
});

test("the demo policy allows no backend", () => {
	const policy = policyFor({ ...readConfig(), demo: true });
	expect(policy).toContain("connect-src 'self';");
	expect(policy).not.toContain("rubypals");
});

test("the demo build is the app with demo mode on and its own policy", async () => {
	const parent = await mkdtemp(join(tmpdir(), "easy-grader-demo-"));
	const site = join(parent, "site");
	try {
		execFileSync(process.execPath, ["tools/build-demo.mjs", site], {
			stdio: "ignore",
		});
		const config = readConfig(join(site, "js", "config.js"));
		expect(config.demo).toBe(true);
		for (const page of pages) {
			const html = await readFile(join(site, page), "utf8");
			expect(html.match(metaPattern), page).not.toBeNull();
			expect(withPolicy(html, config), page).toBe(html);
		}
		expect(await readdir(site)).toEqual(
			expect.arrayContaining(["assets", "js", "index.html"]),
		);
		// It will not write over an existing site.
		expect(() =>
			execFileSync(process.execPath, ["tools/build-demo.mjs", site], {
				stdio: "ignore",
			}),
		).toThrow();
	} finally {
		await rm(parent, { recursive: true, force: true });
	}
});
