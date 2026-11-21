import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { describeFailure } from "./failure";

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
