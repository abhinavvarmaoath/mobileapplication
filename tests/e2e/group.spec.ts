import { expect, test } from "../support/app";

test("the team upload page has a file input that is not part of a form", async ({
	app,
}) => {
	await app.open("viewTeams.html");
	await expect(app.page.locator('input[type="file"]')).toHaveCount(1);
	await expect(app.page.locator("form")).toHaveCount(0);
	expect(app.backend.calls).toEqual([]);
});
