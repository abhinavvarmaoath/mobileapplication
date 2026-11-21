import { boot } from "../lib/boot";
import { courseField, noCourses } from "../lib/courses";
import { h } from "../lib/dom";
import { refusedAs } from "../lib/failure";
import { renderForm } from "../lib/form";
import { categoryFields, readMarks } from "../lib/marks";
import { renderShell } from "../lib/shell";
import { loadInto } from "../lib/status";

// B11: the old page allowed up to 500, so this one does too.
const most = 500;

void boot(async ({ api, root }) => {
	const main = renderShell(root, {
		role: "professor",
		current: "set.html",
		heading: "Marks",
	});
	const region = h("div");
	main.append(region);
	await loadInto({
		busy: main,
		region,
		loadingText: "Loading courses…",
		failureText: "The courses could not be loaded.",
		load: () => api.getCourses(),
		show: (courses) => {
			if (courses.length === 0) return noCourses();
			return renderForm({
				fields: [
					courseField(courses),
					...categoryFields({
						rule: { required: true, number: { min: 0, max: most } },
						control: { kind: "number", min: 0, max: most, step: "any" },
					}),
				],
				submit: "Save marks",
				saved: "Marks saved.",
				async onSubmit(values) {
					try {
						await api.saveMarks(values.courseId ?? "", readMarks(values));
					} catch (error) {
						throw refusedAs(error, "The marks could not be saved. Try again.");
					}
				},
			}).element;
		},
	});
});
