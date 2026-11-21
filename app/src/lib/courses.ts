import type { Course } from "../api";
import { h } from "./dom";
import type { FormField } from "./form";

/** The field every setup and grading form starts with. */
export function courseField(courses: readonly Course[]): FormField {
	return {
		name: "courseId",
		label: "Course",
		wide: true,
		rule: { required: true, requiredMessage: "Choose a course" },
		control: {
			kind: "select",
			placeholder: "Select a course",
			options: courses.map((course) => ({
				value: course.id,
				label: course.name,
			})),
		},
	};
}

/** What shows when the backend has no courses yet. */
export function noCourses(): HTMLElement {
	return h(
		"p",
		{},
		"There are no courses yet. ",
		h("a", { href: "prohome.html" }, "Add one on the home page."),
	);
}
