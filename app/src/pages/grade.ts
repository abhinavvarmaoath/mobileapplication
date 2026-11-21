import { boot } from "../lib/boot";
import { courseField, noCourses } from "../lib/courses";
import { h } from "../lib/dom";
import { describeFailure, refusedAs } from "../lib/failure";
import { renderForm } from "../lib/form";
import { categoryFields, readMarks } from "../lib/marks";
import { renderShell } from "../lib/shell";
import { loadInto } from "../lib/status";

void boot(async ({ api, root }) => {
	const main = renderShell(root, {
		role: "professor",
		current: "grade.html",
		heading: "Grade a student",
	});
	const region = h("div");
	// A live region that is always there, so a new result is announced.
	const result = h("div", { class: "result", role: "status" });
	main.append(region);

	await loadInto({
		busy: main,
		region,
		loadingText: "Loading courses…",
		failureText: "The courses could not be loaded.",
		load: () => api.getCourses(),
		show: (courses) => {
			if (courses.length === 0) return noCourses();
			const form = renderForm({
				fields: [
					courseField(courses),
					{
						name: "studentId",
						label: "Student",
						wide: true,
						rule: { required: true, requiredMessage: "Choose a student" },
						control: {
							kind: "select",
							placeholder: "Select a student",
							options: [],
						},
					},
					...categoryFields({
						rule: { required: true, number: { min: 0, max: 100 } },
						control: { kind: "number", min: 0, max: 100, step: "any" },
					}),
				],
				columns: 2,
				submit: "Compute grade",
				async onSubmit(values) {
					result.replaceChildren();
					try {
						const grade = await api.computeAndSave({
							courseId: values.courseId ?? "",
							studentId: values.studentId ?? "",
							marks: readMarks(values),
						});
						result.replaceChildren(
							h(
								"p",
								{},
								"Computed grade ",
								h("strong", { class: "grade" }, grade.grade),
							),
							h("p", {}, `Percentage ${grade.percentage}`),
							h("p", {}, `Marks ${grade.totalMarks}`),
						);
					} catch (error) {
						throw refusedAs(
							error,
							"The grade could not be computed. Try again.",
						);
					}
				},
			});

			const course = form.element.querySelector<HTMLSelectElement>("#courseId");
			async function showStudents(courseId: string): Promise<void> {
				form.setNote("studentId", "");
				form.setOptions(
					"studentId",
					[],
					courseId ? "Loading students…" : "Select a student",
				);
				if (!courseId) return;
				try {
					const students = await api.getStudents(courseId);
					// A reply for a course that is no longer chosen is not wanted.
					if (course?.value !== courseId) return;
					form.setOptions(
						"studentId",
						students.map((student) => ({
							value: student.id,
							label: student.name,
						})),
						"Select a student",
					);
				} catch (error) {
					if (course?.value !== courseId) return;
					form.setOptions("studentId", [], "Select a student");
					form.setNote(
						"studentId",
						`The students could not be loaded. ${describeFailure(error)}`,
					);
				}
			}
			course?.addEventListener("change", () => void showStudents(course.value));
			return h("div", { class: "stack" }, form.element, result);
		},
	});
});
