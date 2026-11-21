import { readdirSync, readFileSync } from "node:fs";
import { metaPattern } from "../../tools/csp.mjs";
import { type App, expect, test } from "../support/app";
import { useConfig } from "../support/config";
import { pages } from "../support/pages";
import { chooseCourse, chooseStudent, openSettings } from "../support/screens";

// grade.html makes all three kinds of call: the course list, the student
// list of a course, and a save.
async function gradeAStudent(app: App): Promise<string[]> {
	await app.open("grade.html");
	await chooseCourse(app.page, "CMPE 235");
	await chooseStudent(app.page, "Ada Lovelace");
	await openSettings(app.page);
	await app.page.locator("#gr button[type=submit]").click();
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

test("nothing but js/config.js names a host", () => {
	const scripts = new URL("../../js/", import.meta.url);
	const files = [
		...readdirSync(scripts)
			.filter((name) => name.endsWith(".js") && name !== "config.js")
			.map((name) => new URL(name, scripts)),
		...pages.map((page) => new URL(`../../${page}`, import.meta.url)),
	];
	expect(files.length).toBeGreaterThan(pages.length);
	for (const file of files) {
		// The policy meta is generated from the config and checked by csp.spec.
		const source = readFileSync(file, "utf8").replace(metaPattern, "");
		expect(source, file.pathname).not.toMatch(/https?:\/\//);
	}
});
