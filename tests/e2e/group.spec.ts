import { expect, test } from "../support/app";

test("the team page embeds the course materials from a third-party host", async ({
	app,
}) => {
	await app.open("team.html");
	const frame = app.page.locator("iframe");
	await expect(frame).toHaveAttribute(
		"src",
		"http://varmapp.com/list_files.php",
	);
	await expect(frame).toHaveAttribute("width", "400");
	await expect(frame).toHaveAttribute("height", "500");
});

test("the chat page embeds a fixed-size room that is always the same team", async ({
	app,
}) => {
	await app.open("chat.html");
	const frame = app.page.locator("iframe");
	await expect(frame).toHaveAttribute(
		"src",
		"http://www.hiippoo.com/chatroom1.php?team=hello",
	);
	await expect(frame).toHaveAttribute("width", "600");
	await expect(frame).toHaveAttribute("height", "600");
});

// Known issue S5: the frame is not allowed to use the camera or microphone,
// so a call cannot start in current browsers.
test("the video call page embeds a call widget without camera access", async ({
	app,
}) => {
	await app.open("videoCall.html");
	const frame = app.page.locator("iframe");
	await expect(frame).toHaveAttribute("src", "https://www.gruveo.com/embed/");
	await expect(frame).toHaveAttribute("width", "480");
	await expect(frame).toHaveAttribute("height", "300");
	await expect(frame).not.toHaveAttribute("allow", /.*/);
});

test("the team upload page has a file input that is not part of a form", async ({
	app,
}) => {
	await app.open("viewTeams.html");
	await expect(app.page.locator('input[type="file"]')).toHaveCount(1);
	await expect(app.page.locator("form")).toHaveCount(0);
	expect(app.backend.calls).toEqual([]);
});
