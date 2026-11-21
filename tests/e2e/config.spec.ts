import { readdirSync, readFileSync } from "node:fs";
import { type App, expect, test } from "../support/app";
import { useConfig } from "../support/config";
import { chooseCourse, chooseStudent } from "../support/screens";

// grade.html makes all three kinds of call: the course list, the student
// list of a course, and a save.
async function gradeAStudent(app: App): Promise<string[]> {
	await app.open("grade.html");
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	for (const name of [
		"Homework",
		"Labs",
		"Project",
		"Presentation",
		"Midterm",
		"Final",
	]) {
		await app.page.getByLabel(name, { exact: true }).fill("60");
	}
	await app.page.getByRole("button", { name: "Compute grade" }).click();
	await expect
		.poll(() => app.backend.callsTo("compute_and_save_grade.php"))
		.toHaveLength(1);
	return app.backend.calls.map((call) => call.url.split("?")[0] ?? "");
}

test("calls the backend over HTTPS at the default addresses", async ({
	app,
}) => {
	expect(await gradeAStudent(app)).toEqual([
		"https://rubypals.com/cmpe235/phpcode/get_course.php",
		"https://rubypals.com/cmpe235/phpcode/get_students_by_course.php",
		"https://rubypals.com/phonegapstyle/phpcode/compute_and_save_grade.php",
	]);
});

test("calls the addresses set in js/config.js", async ({ app }) => {
	app.backend.apiHosts.add("api.example.test");
	app.backend.apiHosts.add("lookup.example.test");
	await useConfig(app.page, {
		apiBase: "https://api.example.test/v2/",
		lookupBase: "https://lookup.example.test/",
	});
	expect(await gradeAStudent(app)).toEqual([
		"https://lookup.example.test/get_course.php",
		"https://lookup.example.test/get_students_by_course.php",
		"https://api.example.test/v2/compute_and_save_grade.php",
	]);
});

test("nothing but the config names a host", () => {
	const repo = new URL("../../", import.meta.url);
	const names = (dir: string, keep: (name: string) => boolean, deep = true) =>
		readdirSync(new URL(dir, repo), { recursive: deep })
			.map(String)
			.filter(keep)
			.map((name) => new URL(`${dir}${name}`, repo));
	const files = [
		...names("app/", (name) => name.endsWith(".html")),
		...names(
			"app/src/",
			(name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
		),
	];
	expect(files.length).toBeGreaterThan(20);
	for (const file of files) {
		expect(readFileSync(file, "utf8"), file.pathname).not.toMatch(
			/https?:\/\//,
		);
	}
});
