import { h } from "./dom";

export type Role = "student" | "professor";

interface Tab {
	href: string;
	label: string;
}

const tabs: Record<Role, readonly Tab[]> = {
	student: [
		{ href: "stuhome.html", label: "Home" },
		{ href: "team.html", label: "Group" },
		{ href: "viewGrades.html", label: "Grades" },
	],
	professor: [
		{ href: "prohome.html", label: "Home" },
		{ href: "set.html", label: "Marks" },
		{ href: "set1.html", label: "Weights" },
		{ href: "set2.html", label: "Scale" },
		{ href: "grade.html", label: "Grade" },
	],
};

export interface ShellOptions {
	role: Role;
	/** The page the tab bar marks as current. */
	current: string;
	/** The screen's heading. */
	heading: string;
}

/**
 * Draws the header and the tab bar into root, and returns the main element
 * with its heading in place, ready for the screen's own content.
 */
export function renderShell(
	root: HTMLElement,
	{ role, current, heading }: ShellOptions,
): HTMLElement {
	const main = h("main", { id: "main", class: "screen" }, h("h1", {}, heading));
	root.replaceChildren(
		h("a", { class: "skip-link", href: "#main" }, "Skip to content"),
		h(
			"header",
			{ class: "shell-header" },
			h("p", { class: "brand" }, "Easy Grader"),
			h("a", { class: "signout", href: "index.html" }, "Logout"),
		),
		h(
			"nav",
			{ class: "tabs", "aria-label": "Main" },
			h(
				"ul",
				{},
				...tabs[role].map((tab) =>
					h(
						"li",
						{},
						h(
							"a",
							{
								href: tab.href,
								"aria-current": tab.href === current ? "page" : undefined,
							},
							tab.label,
						),
					),
				),
			),
		),
		main,
	);
	return main;
}
