import type { LoginAccount } from "../api";
import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { renderForm } from "../lib/form";

void boot(({ api, root }) => {
	const { element: form } = renderForm({
		fields: [
			{
				name: "ID",
				label: "Username",
				rule: { required: true },
				control: { kind: "text", autocomplete: "username" },
			},
			{
				name: "password",
				label: "Password",
				rule: { required: true },
				control: { kind: "password", autocomplete: "current-password" },
			},
			{
				name: "slider2",
				label: "Account type",
				value: "student",
				control: {
					kind: "choice",
					options: [
						{ value: "student", label: "Student" },
						{ value: "professor", label: "Professor" },
					],
				},
			},
		],
		submit: "Login",
		cancel: "Cancel",
		async onSubmit(values) {
			const { professor } = await api.login({
				id: values.ID ?? "",
				password: values.password ?? "",
				account: (values.slider2 ?? "student") as LoginAccount,
			});
			// Anything but a professor goes to the student home; see B1.
			location.assign(professor ? "prohome.html" : "stuhome.html");
		},
	});
	root.replaceChildren(
		h(
			"main",
			{ class: "page" },
			h("h1", {}, "Login"),
			form,
			h(
				"p",
				{ class: "aside" },
				"New here? ",
				h("a", { href: "signup.html" }, "Sign up"),
			),
		),
	);
});
