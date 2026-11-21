import type { SignupAccount } from "../api";
import { boot } from "../lib/boot";
import { h } from "../lib/dom";
import { FormProblem, renderForm } from "../lib/form";

void boot(({ api, root }) => {
	const form = renderForm({
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
				control: { kind: "password", autocomplete: "new-password" },
			},
			{
				name: "confirmation",
				label: "Confirm password",
				rule: { required: true, matches: "password" },
				control: { kind: "password", autocomplete: "new-password" },
			},
			{
				name: "fullName",
				label: "Name",
				control: { kind: "text", autocomplete: "name" },
			},
			{
				name: "email",
				label: "Email",
				rule: { email: true },
				control: { kind: "email", autocomplete: "email" },
			},
			{
				name: "phone",
				label: "Phone",
				control: { kind: "tel", autocomplete: "tel" },
			},
			{
				name: "Type",
				label: "Account type",
				value: "Student",
				control: {
					kind: "choice",
					options: [
						{ value: "Student", label: "Student" },
						{ value: "Prof", label: "Professor" },
					],
				},
			},
		],
		submit: "Sign up",
		cancel: "Cancel",
		async onSubmit(values) {
			const { created } = await api.signup({
				id: values.ID ?? "",
				password: values.password ?? "",
				confirmation: values.confirmation ?? "",
				name: values.fullName ?? "",
				email: values.email ?? "",
				phone: values.phone ?? "",
				account: (values.Type ?? "Student") as SignupAccount,
			});
			if (!created) {
				throw new FormProblem(
					"The account could not be created. Check your details and try again.",
				);
			}
			location.assign("index.html");
		},
	});
	root.replaceChildren(
		h(
			"main",
			{ class: "page" },
			h("h1", {}, "Sign up"),
			form,
			h(
				"p",
				{ class: "aside" },
				"Already registered? ",
				h("a", { href: "index.html" }, "Login"),
			),
		),
	);
});
