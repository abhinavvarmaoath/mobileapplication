import { categories } from "../api";
import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderShell } from "../lib/shell";
import { loadInto } from "../lib/status";

void boot(async ({ api, root }) => {
	const main = renderShell(root, {
		role: "student",
		current: "viewGrades.html",
		heading: "Grades",
	});
	const region = h("div");
	main.append(region);

	await loadInto({
		busy: main,
		region,
		loadingText: "Loading your grades…",
		failureText: "Your grades could not be loaded.",
		load: () => api.getStudentGrades(),
		show: (grades) =>
			h(
				"dl",
				{ class: "rows" },
				...categories.map((name) =>
					h("div", {}, h("dt", {}, name), h("dd", {}, grades.marks[name])),
				),
				h(
					"div",
					{ class: "grade" },
					h("dt", {}, "Grade"),
					h("dd", {}, grades.grade),
				),
			),
	});
});
