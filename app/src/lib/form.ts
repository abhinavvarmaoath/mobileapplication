import { checkAll, type Field } from "../forms/validate";
import { h } from "./dom";
import { describeFailure } from "./failure";

export type Control =
	| { kind: "text" | "password" | "email" | "tel"; autocomplete?: string }
	| { kind: "number"; min?: number; max?: number; step?: number }
	| {
			kind: "choice";
			options: ReadonlyArray<{ value: string; label: string }>;
	  };

export interface FormField extends Field {
	control: Control;
	/** What the field starts with, and returns to when the form is reset. */
	value?: string;
	hint?: string;
}

export interface FormSpec {
	fields: readonly FormField[];
	submit: string;
	cancel?: string;
	/** Called with the values once they pass the rules. A throw is shown. */
	onSubmit(values: Record<string, string>): Promise<void>;
}

interface Rendered {
	element: HTMLElement;
	controls: HTMLInputElement[];
	error: HTMLElement;
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
export function renderForm(spec: FormSpec): HTMLFormElement {
	const fields = spec.fields.map((field) => ({ field, ...renderField(field) }));
	const summary = h("div", {
		class: "error-summary",
		role: "alert",
		tabindex: "-1",
		hidden: true,
	});
	const failure = h("p", { class: "form-error", role: "alert", hidden: true });
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
		{ class: "form", novalidate: true },
		summary,
		...fields.map((f) => f.element),
		failure,
		h("div", { class: "actions" }, cancel, submit),
	);

	function clearMessages(): void {
		summary.hidden = true;
		summary.replaceChildren();
		failure.hidden = true;
		failure.textContent = "";
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
		if (Object.keys(problems).length > 0) return showProblems(problems);

		// Busy is set before the first await, so a test or a screen reader sees it
		// as soon as the button is pressed.
		form.setAttribute("aria-busy", "true");
		submit.disabled = true;
		try {
			await spec.onSubmit(entered);
		} catch (error) {
			failure.textContent = describeFailure(error);
			failure.hidden = false;
		} finally {
			form.removeAttribute("aria-busy");
			submit.disabled = false;
		}
	});
	return form;
}
