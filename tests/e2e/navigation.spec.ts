import { expect, test } from "../support/app";
import { pages } from "../support/pages";

const professorNav = [
	"prohome.html",
	"set.html",
	"set1.html",
	"set2.html",
	"grade.html",
];
const studentNav = ["stuhome.html", "team.html", "viewGrades.html"];

// Every link target on each page, in document order. Links that only open a
// popup (href="#...") and links to third-party tools, which tools.spec covers,
// are left out.
const links: Record<string, string[]> = {
	"index.html": ["signup.html"],
	"signup.html": ["index.html"],
	"prohome.html": [...professorNav, "index.html", "student.html"],
	"student.html": professorNav,
	"stuhome.html": ["index.html", ...studentNav],
	"set.html": professorNav,
	"set1.html": professorNav,
	"set2.html": professorNav,
	"grade.html": professorNav,
	"grades.html": studentNav,
	"viewGrades.html": [...studentNav, "grades.html"],
	"team.html": ["index.html", ...studentNav, "chat.html", "videoCall.html"],
	"chat.html": ["index.html", ...studentNav],
	"videoCall.html": ["index.html", ...studentNav],
	"viewTeams.html": studentNav,
};

test("every page has an expectation", () => {
	expect(Object.keys(links).sort()).toEqual([...pages].sort());
});

for (const [path, expected] of Object.entries(links)) {
	test(`${path} links to ${expected.length} places`, async ({ app }) => {
		await app.open(path);
		const hrefs = await app.page
			.locator("a[href]")
			.evaluateAll((anchors) =>
				anchors
					.map((anchor) => anchor.getAttribute("href") ?? "")
					.filter((href) => !/^(#|https:)/.test(href)),
			);
		expect(hrefs).toEqual(expected);
	});
}
