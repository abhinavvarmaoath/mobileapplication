import { categories, type PerCategory } from "../api";
import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderForm } from "../lib/form";
import { renderShell } from "../lib/shell";

// B10: like the old page, this one always acts for student 1 in course 1.
const student = { courseId: "1", studentId: "1" };

void boot(({ api, root }) => {
	const main = renderShell(root, {
		role: "student",
		current: "viewGrades.html",
		heading: "Estimate grades",
	});
	// A live region that is always there, so a new estimate is announced.
	const result = h("div", { class: "result", role: "status" });
	const { element: form } = renderForm({
		fields: categories.map((name) => ({
			name,
			label: name,
			hint: "0 to 100",
			rule: { required: true, number: { min: 0, max: 100 } },
			control: { kind: "number", min: 0, max: 100, step: "any" },
		})),
		submit: "Compute grade",
		async onSubmit(values) {
			result.replaceChildren();
			const marks = Object.fromEntries(
				categories.map((name) => [name, Number(values[name])]),
			) as PerCategory;
			const estimate = await api.estimate({ ...student, marks });
			result.replaceChildren(
				h(
					"p",
					{},
					"Estimated grade ",
					h("strong", { class: "grade" }, estimate.grade),
				),
				h("p", {}, `Percentage ${estimate.percentage}`),
			);
		},
	});
	main.append(
		h("a", { class: "button", href: "grades.html" }, "View grades"),
		form,
		result,
	);
});
