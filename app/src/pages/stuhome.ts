import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderShell } from "../lib/shell";

void boot(({ root }) => {
	const main = renderShell(root, {
		role: "student",
		current: "stuhome.html",
		heading: "Home",
	});
	main.append(
		h(
			"details",
			{ class: "disclosure" },
			h("summary", {}, "Who is my professor?"),
			h("p", {}, "Professor Neumann"),
		),
	);
});
