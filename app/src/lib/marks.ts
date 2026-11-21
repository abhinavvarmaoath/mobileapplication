import { type Category, categories, type PerCategory } from "../api";
import type { Rule } from "../forms/validate";
import type { Control, FormField } from "./form";

interface CategoryFields {
	/** The label for a category; its name by default. */
	label?: (name: Category) => string;
	hint?: string;
	rule: Rule;
	control: Control;
}

/** One field per grading category, named after it, built from the shared list. */
export function categoryFields({
	label,
	hint,
	rule,
	control,
}: CategoryFields): FormField[] {
	return categories.map((name) => ({
		name,
		label: label ? label(name) : name,
		hint,
		rule,
		control,
	}));
}

/** The numbers entered into the category fields. */
export function readMarks(values: Record<string, string>): PerCategory {
	return Object.fromEntries(
		categories.map((name) => [name, Number(values[name])]),
	) as PerCategory;
}
