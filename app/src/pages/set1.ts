import { categories } from "../api";
import { boot } from "../lib/boot";
import { courseField, noCourses } from "../lib/courses";
import { h } from "../lib/dom";
import { refusedAs } from "../lib/failure";
import { renderForm } from "../lib/form";
import { categoryFields, readMarks } from "../lib/marks";
import { renderShell } from "../lib/shell";
import { loadInto } from "../lib/status";

void boot(async ({ api, root }) => {
	const main = renderShell(root, {
		role: "professor",
		current: "set1.html",
		heading: "Weights",
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
						label: (name) => `${name} (%)`,
						rule: { required: true, number: { min: 0, max: 100 } },
						control: { kind: "number", min: 0, max: 100, step: "any" },
					}),
				],
				submit: "Save weights",
				saved: "Weights saved.",
				validate(values): Record<string, string> {
					const total = Object.values(readMarks(values)).reduce(
						(sum, percent) => sum + percent,
						0,
					);
					if (Math.round(total * 1000) / 1000 === 100) return {};
					const message = `The weights must add up to 100. They add up to ${total}.`;
					return { [categories[0]]: message };
				},
				async onSubmit(values) {
					try {
						await api.savePercentages(values.courseId ?? "", readMarks(values));
					} catch (error) {
						throw refusedAs(
							error,
							"The weights were not saved. They have to add up to 100.",
						);
					}
				},
			}).element;
		},
	});
});
