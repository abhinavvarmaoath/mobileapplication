import { ApiError } from "./errors";

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The server sends numbers as strings or as numbers; both become text. */
export function asText(value: unknown): string | undefined {
	if (typeof value === "string") return value;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return undefined;
}

export function shapeError(what: string): ApiError {
	return new ApiError("shape", `The server's answer was not ${what}`);
}

export function parseJson(body: string, what: string): unknown {
	try {
		return JSON.parse(body);
	} catch {
		throw shapeError(what);
	}
}

/** Reads the named fields as text, or fails naming what was expected. */
export function textFields<K extends string>(
	value: unknown,
	keys: readonly K[],
	what: string,
): Record<K, string> {
	if (!isRecord(value)) throw shapeError(what);
	const out = {} as Record<K, string>;
	for (const key of keys) {
		const text = asText(value[key]);
		if (text === undefined) throw shapeError(what);
		out[key] = text;
	}
	return out;
}
