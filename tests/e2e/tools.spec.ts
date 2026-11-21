import { expect, test } from "../support/app";
import { useConfig } from "../support/config";

// The third-party tools. Each is a link to the address in js/config.js that
// opens in a new tab; nothing is framed.
const tools = [
	{
		page: "prohome.html",
		key: "greensheet",
		button: "View Greensheet",
		address:
			"https://openloop.com/education/classes/sjsu_engr/engr_mobile_dev/fall2015/index.php",
	},
	{
		page: "team.html",
		key: "materials",
		button: "Download Course Material",
		address: "https://varmapp.com/list_files.php",
	},
	{
		page: "chat.html",
		key: "chat",
		button: "Chat now!",
		address: "https://www.hiippoo.com/chatroom1.php?team=hello",
	},
	{
		page: "videoCall.html",
		key: "video",
		button: "Call now!",
		address: "https://www.gruveo.com/embed/",
	},
];

for (const { page, key, button, address } of tools) {
	test.describe(page, () => {
		test("links to the tool in a new tab and does not frame it", async ({
			app,
		}) => {
			await app.open(page);
			const link = app.page.getByRole("button", { name: button });
			await expect(link).toHaveAttribute("href", address);
			await expect(link).toHaveAttribute("target", "_blank");
			await expect(link).toHaveAttribute("rel", "noopener noreferrer");
			await expect(app.page.locator("iframe")).toHaveCount(0);
			expect(app.backend.hosts, "hosts contacted before the click").toEqual([]);
		});

		test("opens the tool without handing it this page", async ({ app }) => {
			await app.open(page);
			const [tab] = await Promise.all([
				app.page.context().waitForEvent("page"),
				app.page.getByRole("button", { name: button }).click(),
			]);
			await tab.waitForLoadState();
			expect(tab.url()).toBe(address);
			expect(await tab.evaluate(() => window.opener === null)).toBe(true);
		});

		test("uses the address set in js/config.js", async ({ app }) => {
			await useConfig(app.page, {
				tools: { [key]: "https://tool.example.test/room" },
			});
			await app.open(page);
			await expect(
				app.page.getByRole("button", { name: button }),
			).toHaveAttribute("href", "https://tool.example.test/room");
		});

		test("leaves the tool out when it has no address", async ({ app }) => {
			await useConfig(app.page, { tools: { [key]: "" } });
			await app.open(page);
			await expect(app.page.getByRole("button", { name: button })).toHaveCount(
				0,
			);
		});
	});
}

test.describe("student.html", () => {
	test("offers a link to the student tool for each of six students", async ({
		app,
	}) => {
		await app.open("student.html");
		const links = app.page.locator("a[data-tool=student]");
		await expect(links).toHaveText([
			"Ada Lovelace",
			"Alan Turing",
			"Charles Babbage",
			"Edsger Dijkstra",
			"Grace Hopper",
			"Katherine Johnson",
		]);
		for (const link of await links.all()) {
			await expect(link).toHaveAttribute("href", "https://varmapp.com/");
			await expect(link).toHaveAttribute("target", "_blank");
			await expect(link).toHaveAttribute("rel", "noopener noreferrer");
		}
		await expect(app.page.locator("iframe")).toHaveCount(0);
		expect(app.backend.hosts, "hosts contacted before a click").toEqual([]);
	});
});
