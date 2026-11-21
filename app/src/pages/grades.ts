import { categories } from "../api";
import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { describeFailure } from "../lib/failure";
import { renderShell } from "../lib/shell";
import { failed, loading } from "../lib/status";

void boot(async ({ api, root }) => {
	const main = renderShell(root, {
		role: "student",
		current: "viewGrades.html",
		heading: "Grades",
	});
	const region = h("div");
	main.append(region);

	async function load(): Promise<void> {
		main.setAttribute("aria-busy", "true");
		region.replaceChildren(loading("Loading your grades…"));
		try {
			const grades = await api.getStudentGrades();
			region.replaceChildren(
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
			);
		} catch (error) {
			region.replaceChildren(
				failed(
					`Your grades could not be loaded. ${describeFailure(error)}`,
					load,
				),
			);
		} finally {
			main.removeAttribute("aria-busy");
		}
	}
	await load();
});
