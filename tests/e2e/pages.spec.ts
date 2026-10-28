import { expect, test } from "../support/app";
import { pages } from "../support/pages";

// Hosts each page contacts while loading. Pages that only call the API when
// a form is submitted do not list it here.
const hostsOnLoad: Record<string, string[]> = {
	"index.html": ["code.jquery.com"],
	"signup.html": ["code.jquery.com"],
	"prohome.html": ["code.jquery.com", "fonts.googleapis.com", "openloop.com"],
	"student.html": ["code.jquery.com", "varmapp.com"],
	"stuhome.html": ["code.jquery.com", "fonts.googleapis.com"],
	"set.html": ["code.jquery.com", "fonts.googleapis.com", "rubypals.com"],
	"set1.html": ["code.jquery.com", "fonts.googleapis.com", "rubypals.com"],
	"set2.html": ["code.jquery.com", "fonts.googleapis.com", "rubypals.com"],
	"grade.html": ["code.jquery.com", "fonts.googleapis.com", "rubypals.com"],
	"grades.html": ["code.jquery.com", "rubypals.com"],
	"viewGrades.html": ["code.jquery.com", "fonts.googleapis.com"],
	"team.html": ["code.jquery.com", "fonts.googleapis.com", "varmapp.com"],
	"chat.html": ["code.jquery.com", "www.hiippoo.com"],
	"videoCall.html": [
		"code.jquery.com",
		"fonts.googleapis.com",
		"www.gruveo.com",
	],
	"viewTeams.html": ["code.jquery.com"],
};

test("every page has an expectation", () => {
	expect(Object.keys(hostsOnLoad).sort()).toEqual([...pages].sort());
});

for (const [path, hosts] of Object.entries(hostsOnLoad)) {
	test(`${path} loads cleanly and contacts only the expected hosts`, async ({
		app,
	}) => {
		await app.open(path);
		expect(app.pageErrors).toEqual([]);
		expect(app.consoleErrors).toEqual([]);
		expect(app.backend.blocked).toEqual([]);
		expect([...app.backend.hosts].sort()).toEqual(hosts);
	});
}
