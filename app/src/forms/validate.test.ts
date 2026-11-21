import { describe, expect, it } from "vitest";
import { check, checkAll, type Field } from "./validate";

const username: Field = {
	name: "ID",
	label: "Username",
	rule: { required: true },
};

describe("required", () => {
	it.each(["", "   "])("refuses %j", (value) => {
		expect(check(username, value)).toBe("Username is required");
	});

	it("accepts text", () => {
		expect(check(username, "ada")).toBeUndefined();
	});

	it("lets an optional field stay empty, whatever else it must be", () => {
		const field: Field = {
			name: "x",
			label: "Phone",
			rule: { number: { min: 0 } },
		};
		expect(check(field, "")).toBeUndefined();
	});

	it("has nothing to check without a rule", () => {
		expect(check({ name: "x", label: "Name" }, "")).toBeUndefined();
	});
});

describe("email", () => {
	const field: Field = { name: "e", label: "Email", rule: { email: true } };

	it.each(["ada@example.test", "a.b+c@d.co", "a@b"])("accepts %s", (value) => {
		expect(check(field, value)).toBeUndefined();
	});

	it.each(["ada", "ada@", "@example.test", "a b@example.test", "a@b..c"])(
		"refuses %s",
		(value) => {
			expect(check(field, value)).toBe("Email must be an email address");
		},
	);
});

describe("number", () => {
	const percent: Field = {
		name: "p",
		label: "Homework",
		rule: { required: true, number: { min: 0, max: 100 } },
	};

	it.each(["0", "50", "100", " 7.5 "])("accepts %j", (value) => {
		expect(check(percent, value)).toBeUndefined();
	});

	it.each(["-1", "100.1", "101"])("refuses %s as out of range", (value) => {
		expect(check(percent, value)).toBe("Homework must be between 0 and 100");
	});

	it.each(["abc", "1e", "Infinity"])("refuses %s as not a number", (value) => {
		expect(check(percent, value)).toBe("Homework must be a number");
	});

	it("words a one-sided bound", () => {
		const atLeast: Field = {
			name: "a",
			label: "Count",
			rule: { number: { min: 1 } },
		};
		const atMost: Field = {
			name: "b",
			label: "Count",
			rule: { number: { max: 9 } },
		};
		expect(check(atLeast, "0")).toBe("Count must be at least 1");
		expect(check(atMost, "10")).toBe("Count must be at most 9");
	});
});

describe("checkAll", () => {
	it("names only the fields with a problem", () => {
		const fields: Field[] = [
			username,
			{ name: "password", label: "Password", rule: { required: true } },
		];
		expect(checkAll(fields, { ID: "ada", password: "" })).toEqual({
			password: "Password is required",
		});
	});

	it("treats a missing value as empty", () => {
		expect(checkAll([username], {})).toEqual({ ID: "Username is required" });
	});

	it("finds nothing wrong with a good form", () => {
		expect(checkAll([username], { ID: "ada" })).toEqual({});
	});
});

describe("matches", () => {
	const fields: Field[] = [
		{ name: "password", label: "Password", rule: { required: true } },
		{
			name: "again",
			label: "Confirm password",
			rule: { required: true, matches: "password" },
		},
	];

	it("accepts the same value twice", () => {
		expect(checkAll(fields, { password: "pw1", again: "pw1" })).toEqual({});
	});

	it("names the other field when the values differ", () => {
		expect(checkAll(fields, { password: "pw1", again: "pw2" })).toEqual({
			again: "Confirm password must match password",
		});
	});

	it("says a missing value is missing, not different", () => {
		expect(checkAll(fields, { password: "pw1", again: "" })).toEqual({
			again: "Confirm password is required",
		});
	});

	it("compares exactly, spaces included", () => {
		expect(checkAll(fields, { password: "pw1", again: "pw1 " })).toEqual({
			again: "Confirm password must match password",
		});
	});
});
