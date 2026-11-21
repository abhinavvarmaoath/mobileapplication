import { boot } from "../lib/boot";
import { renderShell } from "../lib/shell";
import { toolLink } from "../lib/tools";

void boot(({ config, root }) => {
	const main = renderShell(root, {
		role: "student",
		current: "team.html",
		heading: "Video call",
	});
	main.append(toolLink(config, "video", "Call now!") ?? "");
});
