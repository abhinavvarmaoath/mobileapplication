export type Child = Node | string | false | null | undefined;
export type Attributes = Record<string, string | boolean | undefined>;

/**
 * Builds an element. Text is always added as text, never parsed as markup, so
 * whatever the server sends cannot become HTML.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attributes: Attributes = {},
	...children: Child[]
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) {
		if (value === undefined || value === false) continue;
		element.setAttribute(name, value === true ? "" : value);
	}
	for (const child of children) {
		if (child) element.append(child);
	}
	return element;
}
