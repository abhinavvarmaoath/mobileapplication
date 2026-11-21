import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderForm } from "../lib/form";
import { renderShell } from "../lib/shell";
import { toolLink } from "../lib/tools";

void boot(({ api, config, root }) => {
	const main = renderShell(root, {
		role: "professor",
		current: "prohome.html",
		heading: "Home",
	});
	const { element: addClass } = renderForm({
		fields: [
			{
				name: "class",
				label: "Class number",
				rule: { required: true },
				control: { kind: "text" },
			},
			{
				name: "description",
				label: "Description",
				control: { kind: "textarea" },
			},
		],
		submit: "Add class",
		cancel: "Clear",
		saved: "Class added.",
		async onSubmit(values) {
			await api.addClass({
				number: values.class ?? "",
				description: values.description ?? "",
			});
			addClass.reset();
		},
	});
	main.append(
		h(
			"section",
			{ class: "stack", "aria-labelledby": "add-class" },
			h("h2", { id: "add-class" }, "Add a class"),
			addClass,
		),
		h(
			"div",
			{ class: "stack section" },
			toolLink(config, "greensheet", "View Greensheet"),
			h("a", { class: "button", href: "student.html" }, "View students"),
		),
	);
});
