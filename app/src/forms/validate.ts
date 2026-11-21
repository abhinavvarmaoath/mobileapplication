export interface Rule {
	required?: boolean;
	/** The value must be an email address, as browsers understand one. */
	email?: boolean;
	/** The value must be a number, within these bounds when they are given. */
	number?: { min?: number; max?: number };
}

export interface Field {
	name: string;
	label: string;
	rule?: Rule;
}

// The pattern the HTML standard gives for type="email".
const email =
	/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function bounds(min: number | undefined, max: number | undefined): string {
	if (min !== undefined && max !== undefined) {
		return `between ${min} and ${max}`;
	}
	return min !== undefined ? `at least ${min}` : `at most ${max}`;
}

/** The first problem with a value, worded for the person who typed it. */
export function check(field: Field, value: string): string | undefined {
	const { label, rule = {} } = field;
	const text = value.trim();
	if (text === "") return rule.required ? `${label} is required` : undefined;
	if (rule.email && !email.test(text)) {
		return `${label} must be an email address`;
	}
	if (rule.number) {
		const number = Number(text);
		if (!Number.isFinite(number)) return `${label} must be a number`;
		const { min, max } = rule.number;
		if (
			(min !== undefined && number < min) ||
			(max !== undefined && number > max)
		) {
			return `${label} must be ${bounds(min, max)}`;
		}
	}
	return undefined;
}

/** The problems with a form's values, by field name. Fields that pass are absent. */
export function checkAll(
	fields: readonly Field[],
	values: Record<string, string>,
): Record<string, string> {
	const problems: Record<string, string> = {};
	for (const field of fields) {
		const problem = check(field, values[field.name] ?? "");
		if (problem) problems[field.name] = problem;
	}
	return problems;
}
