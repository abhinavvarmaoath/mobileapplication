import { expect, test } from "../support/app";
import { pages } from "../support/pages";

// Hosts each page contacts while loading. Pages that only call the API when
// a form is submitted do not list it here.
const hostsOnLoad: Record<string, string[]> = {
	"index.html": [],
	"signup.html": [],
	"prohome.html": ["fonts.googleapis.com", "openloop.com"],
	"student.html": ["varmapp.com"],
	"stuhome.html": ["fonts.googleapis.com"],
	"set.html": ["fonts.googleapis.com", "rubypals.com"],
	"set1.html": ["fonts.googleapis.com", "rubypals.com"],
	"set2.html": ["fonts.googleapis.com", "rubypals.com"],
	"grade.html": ["fonts.googleapis.com", "rubypals.com"],
	"grades.html": ["rubypals.com"],
	"viewGrades.html": ["fonts.googleapis.com"],
	"team.html": ["fonts.googleapis.com", "varmapp.com"],
	"chat.html": ["www.hiippoo.com"],
	"videoCall.html": ["fonts.googleapis.com", "www.gruveo.com"],
	"viewTeams.html": [],
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
