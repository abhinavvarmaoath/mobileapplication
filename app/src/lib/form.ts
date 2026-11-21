import { checkAll, type Field } from "../forms/validate";
import { h } from "./dom";
import { describeFailure, FormProblem } from "./failure";

export { FormProblem };

export type Control =
	| { kind: "text" | "password" | "email" | "tel"; autocomplete?: string }
	| { kind: "textarea"; rows?: number }
	| {
			kind: "select";
			/** The first option, which has no value. */
			placeholder: string;
			options: ReadonlyArray<{ value: string; label: string }>;
	  }
	| { kind: "number"; min?: number; max?: number; step?: number | "any" }
	| {
			kind: "choice";
			options: ReadonlyArray<{ value: string; label: string }>;
	  };

export interface FormField extends Field {
	control: Control;
	/** What the field starts with, and returns to when the form is reset. */
	value?: string;
	/** Takes a whole row when the form is laid out in two columns. */
	wide?: boolean;
	hint?: string;
}

export interface FormSpec {
	fields: readonly FormField[];
	submit: string;
	cancel?: string;
	/** Said after a successful submit, in a live region. */
	saved?: string;
	/** Lay the fields out two to a row; wide fields still take a whole row. */
	columns?: 2;
	/**
	 * Rules that span fields, such as values that must add up. Called only when
	 * every field passes its own rules. Returns problems by field name.
	 */
	validate?(values: Record<string, string>): Record<string, string>;
	/** Called with the values once they pass the rules. A throw is shown. */
	onSubmit(values: Record<string, string>): Promise<void>;
}

type FieldControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface Rendered {
	element: HTMLElement;
	controls: FieldControl[];
	error: HTMLElement;
}

export interface Form {
	element: HTMLFormElement;
}

function renderField(field: FormField): Rendered {
	const error = h("p", {
		id: `${field.name}-error`,
		class: "field-error",
		hidden: true,
	});
	const hint = field.hint
		? h("p", { id: `${field.name}-hint`, class: "hint" }, field.hint)
		: null;
	const { control } = field;

	if (control.kind === "choice") {
		const controls = control.options.map((option) =>
			h("input", {
				type: "radio",
				name: field.name,
				id: `${field.name}-${option.value}`,
				value: option.value,
				checked: option.value === field.value,
			}),
		);
		const options = control.options.map((option, i) =>
			h(
				"span",
				{ class: "choice-option" },
				controls[i],
				h("label", { for: `${field.name}-${option.value}` }, option.label),
			),
		);
		const element = h(
			"fieldset",
			{ class: "field" },
			h("legend", {}, field.label),
			hint,
			h("div", { class: "choice-options" }, ...options),
			error,
		);
		return { element, controls, error };
	}

	if (control.kind === "select") {
		const select = h(
			"select",
			{
				name: field.name,
				id: field.name,
				"aria-describedby": hint ? `${field.name}-hint` : undefined,
			},
			h("option", { value: "" }, control.placeholder),
			...control.options.map((option) =>
				h("option", { value: option.value }, option.label),
			),
		);
		select.value = field.value ?? "";
		const element = h(
			"div",
			{ class: "field" },
			h("label", { for: field.name }, field.label),
			hint,
			select,
			error,
		);
		return { element, controls: [select], error };
	}

	if (control.kind === "textarea") {
		const area = h(
			"textarea",
			{
				name: field.name,
				id: field.name,
				rows: String(control.rows ?? 3),
				"aria-describedby": hint ? `${field.name}-hint` : undefined,
			},
			field.value,
		);
		const element = h(
			"div",
			{ class: "field" },
			h("label", { for: field.name }, field.label),
			hint,
			area,
			error,
		);
		return { element, controls: [area], error };
	}

	const input = h("input", {
		type: control.kind,
		name: field.name,
		id: field.name,
		value: field.value,
		autocomplete: "autocomplete" in control ? control.autocomplete : undefined,
		inputmode: control.kind === "number" ? "decimal" : undefined,
		min:
			control.kind === "number"
				? String(control.min ?? "") || undefined
				: undefined,
		max:
			control.kind === "number"
				? String(control.max ?? "") || undefined
				: undefined,
		step:
			control.kind === "number"
				? String(control.step ?? "") || undefined
				: undefined,
		"aria-describedby": hint ? `${field.name}-hint` : undefined,
	});
	const element = h(
		"div",
		{ class: "field" },
		h("label", { for: field.name }, field.label),
		hint,
		input,
		error,
	);
	return { element, controls: [input], error };
}

/** A form built from a list of fields, with its rules, messages and busy state. */
export function renderForm(spec: FormSpec): Form {
	const fields = spec.fields.map((field) => ({ field, ...renderField(field) }));
	const summary = h("div", {
		class: "error-summary",
		role: "alert",
		tabindex: "-1",
		hidden: true,
	});
	const failure = h("p", { class: "form-error", role: "alert", hidden: true });
	// Always present, so that what it says when it fills is announced.
	const saved = h("p", { class: "form-status", role: "status" });
	const submit = h(
		"button",
		{ type: "submit", class: "button button-primary" },
		spec.submit,
	);
	const cancel = spec.cancel
		? h("button", { type: "reset", class: "button" }, spec.cancel)
		: null;
	const form = h(
		"form",
		{
			class: spec.columns === 2 ? "form form-pairs" : "form",
			novalidate: true,
		},
		summary,
		...fields.map((f) => {
			if (f.field.wide) f.element.classList.add("field-wide");
			return f.element;
		}),
		failure,
		saved,
		h("div", { class: "actions" }, cancel, submit),
	);

	function clearMessages(): void {
		summary.hidden = true;
		summary.replaceChildren();
		failure.hidden = true;
		failure.textContent = "";
		saved.textContent = "";
		for (const { controls, error } of fields) {
			error.hidden = true;
			error.textContent = "";
			for (const control of controls) {
				control.removeAttribute("aria-invalid");
			}
		}
	}

	function showProblems(problems: Record<string, string>): void {
		const items: HTMLElement[] = [];
		for (const { field, controls, error } of fields) {
			const message = problems[field.name];
			if (!message) continue;
			error.textContent = message;
			error.hidden = false;
			for (const control of controls) {
				control.setAttribute("aria-invalid", "true");
				control.setAttribute("aria-describedby", error.id);
			}
			items.push(
				h(
					"li",
					{},
					h("a", { href: `#${controls[0]?.id ?? field.name}` }, message),
				),
			);
		}
		summary.replaceChildren(
			h("h2", {}, "There is a problem"),
			h("ul", {}, ...items),
		);
		summary.hidden = false;
		summary.focus();
	}

	function values(): Record<string, string> {
		const entries = [...new FormData(form)].map(([name, value]) => [
			name,
			String(value),
		]);
		return Object.fromEntries(entries);
	}

	form.addEventListener("reset", clearMessages);
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (form.getAttribute("aria-busy") === "true") return;
		clearMessages();
		const entered = values();
		const problems = checkAll(spec.fields, entered);
		if (Object.keys(problems).length === 0 && spec.validate) {
			Object.assign(problems, spec.validate(entered));
		}
		if (Object.keys(problems).length > 0) return showProblems(problems);

		// Busy is set before the first await, so a test or a screen reader sees it
		// as soon as the button is pressed.
		form.setAttribute("aria-busy", "true");
		submit.disabled = true;
		try {
			await spec.onSubmit(entered);
			if (spec.saved) saved.textContent = spec.saved;
		} catch (error) {
			failure.textContent =
				error instanceof FormProblem ? error.message : describeFailure(error);
			failure.hidden = false;
		} finally {
			form.removeAttribute("aria-busy");
			submit.disabled = false;
		}
	});
	return { element: form };
}
