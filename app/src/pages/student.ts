import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderShell } from "../lib/shell";
import { toolLink } from "../lib/tools";

// B10: the student list is not read from the backend; these are placeholders.
const students = [
	"Ada Lovelace",
	"Alan Turing",
	"Charles Babbage",
	"Edsger Dijkstra",
	"Grace Hopper",
	"Katherine Johnson",
];

void boot(({ config, root }) => {
	const main = renderShell(root, {
		role: "professor",
		current: "prohome.html",
		heading: "Students",
	});
	main.append(
		h(
			"div",
			{ class: "stack" },
			...students.map((name) => toolLink(config, "student", name)),
		),
	);
});
