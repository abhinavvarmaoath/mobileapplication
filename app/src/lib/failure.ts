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
