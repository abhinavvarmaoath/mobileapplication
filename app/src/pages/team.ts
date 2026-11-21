import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderShell } from "../lib/shell";
import { toolLink } from "../lib/tools";

void boot(({ config, root }) => {
	const main = renderShell(root, {
		role: "student",
		current: "team.html",
		heading: "Group",
	});
	main.append(
		h(
			"div",
			{ class: "stack" },
			toolLink(config, "materials", "Download Course Material"),
			h("a", { class: "button", href: "chat.html" }, "Chat"),
			h("a", { class: "button", href: "videoCall.html" }, "Video Call"),
		),
	);
});
