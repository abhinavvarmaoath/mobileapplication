import { type GradeRanges, gradeLetters } from "../api";
import { boot } from "../lib/boot";
import { courseField, noCourses } from "../lib/courses";
import { h } from "../lib/dom";
import { refusedAs } from "../lib/failure";
import { type FormField, renderForm } from "../lib/form";
import { renderShell } from "../lib/shell";
import { loadInto } from "../lib/status";

const rangeRule = { required: true, number: { min: 0, max: 100 } };

const rangeFields: FormField[] = gradeLetters.flatMap((letter) => [
	{
		name: `${letter}RangeStart`,
		label: `${letter} from`,
		rule: rangeRule,
		control: { kind: "number", min: 0, max: 100, step: "any" },
	},
	{
		name: `${letter}RangeEnd`,
		label: `${letter} to`,
		rule: rangeRule,
		control: { kind: "number", min: 0, max: 100, step: "any" },
	},
]);

function readRanges(values: Record<string, string>): GradeRanges {
	return Object.fromEntries(
		gradeLetters.map((letter) => [
			letter,
			{
				start: Number(values[`${letter}RangeStart`]),
				end: Number(values[`${letter}RangeEnd`]),
			},
		]),
	) as GradeRanges;
}

/** Ranges that run backwards, or share even one mark, cannot be saved. */
function rangeProblems(values: Record<string, string>): Record<string, string> {
	const ranges = readRanges(values);
	const problems: Record<string, string> = {};
	gradeLetters.forEach((letter, i) => {
		const { start, end } = ranges[letter];
		if (end < start) {
			problems[`${letter}RangeEnd`] =
				`${letter} must end at or after it starts`;
		}
		for (const earlier of gradeLetters.slice(0, i)) {
			const other = ranges[earlier];
			const overlaps = start <= other.end && other.start <= end;
			if (overlaps && !problems[`${letter}RangeStart`]) {
				problems[`${letter}RangeStart`] =
					`Grade ranges must not overlap: ${earlier} and ${letter} do`;
			}
		}
	});
	return problems;
}

void boot(async ({ api, root }) => {
	const main = renderShell(root, {
		role: "professor",
		current: "set2.html",
		heading: "Grade scale",
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
				fields: [courseField(courses), ...rangeFields],
				columns: 2,
				submit: "Save scale",
				saved: "Grade scale saved.",
				validate: rangeProblems,
				async onSubmit(values) {
					try {
						await api.saveGradeScale(values.courseId ?? "", readRanges(values));
					} catch (error) {
						throw refusedAs(
							error,
							"The grade scale could not be saved. Try again.",
						);
					}
				},
			}).element;
		},
	});
});
