import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { describeFailure, FormProblem, refusedAs } from "./failure";

describe("describeFailure", () => {
	it.each(["network", "timeout"] as const)(
		"says the server was not reached after a %s failure",
		(failure) => {
			expect(describeFailure(new ApiError(failure, "x"))).toMatch(
				/could not be reached/,
			);
		},
	);

	it.each(["status", "shape"] as const)(
		"says the server did not accept it after a %s failure",
		(failure) => {
			expect(describeFailure(new ApiError(failure, "x"))).toMatch(
				/did not accept/,
			);
		},
	);

	it("has something to say about any other error", () => {
		expect(describeFailure(new Error("boom"))).toBe(
			"Something went wrong. Try again.",
		);
	});
});

describe("refusedAs", () => {
	it.each(["status", "shape"] as const)(
		"says what was being done after a %s failure",
		(failure) => {
			const result = refusedAs(
				new ApiError(failure, "x"),
				"The marks could not be saved.",
			);
			expect(result).toBeInstanceOf(FormProblem);
			expect((result as Error).message).toBe("The marks could not be saved.");
		},
	);

	it.each(["network", "timeout"] as const)(
		"leaves a %s failure to its own message",
		(failure) => {
			const error = new ApiError(failure, "x");
			expect(refusedAs(error, "ignored")).toBe(error);
		},
	);

	it("leaves any other error alone", () => {
		const error = new Error("boom");
		expect(refusedAs(error, "ignored")).toBe(error);
	});
});
