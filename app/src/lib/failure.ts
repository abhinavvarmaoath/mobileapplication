import { ApiError } from "../api";

/** What to tell the person when a call to the backend did not work out. */
export function describeFailure(error: unknown): string {
	if (error instanceof ApiError) {
		return error.failure === "network" || error.failure === "timeout"
			? "The server could not be reached. Check your connection and try again."
			: "The server did not accept that. Try again.";
	}
	return "Something went wrong. Try again.";
}

/** Thrown by a form's onSubmit to show this message instead of a generic one. */
export class FormProblem extends Error {}

/**
 * When the server refused or sent something unusable, says what was being
 * done instead of the generic message. A network failure keeps its own.
 */
export function refusedAs(error: unknown, message: string): unknown {
	const refused =
		error instanceof ApiError &&
		(error.failure === "status" || error.failure === "shape");
	return refused ? new FormProblem(message) : error;
}
