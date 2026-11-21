import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ApiRequest,
	categories,
	createClient,
	type GradeRanges,
	type PerCategory,
	type Transport,
} from "./index";

const bases = {
	apiBase: "https://api.test/v/",
	lookupBase: "https://lookup.test/",
};

type Reply = { status?: number; body?: string };

function clientAnswering(reply: Reply = {}) {
	const requests: ApiRequest[] = [];
	const transport: Transport = async (request) => {
		requests.push(request);
		return { status: reply.status ?? 200, body: reply.body ?? "" };
	};
	return { requests, api: createClient({ ...bases, transport }) };
}

function every(value: number): PerCategory {
	return Object.fromEntries(
		categories.map((name) => [name, value]),
	) as PerCategory;
}

const marksFields = categories.map((name) => [`M${name}`, "60"]);

afterEach(() => {
	vi.useRealTimers();
});

describe("sending", () => {
	it("returns the answer to a successful request", async () => {
		const { api } = clientAnswering({ body: "[]" });
		expect(await api.getCourses()).toEqual([]);
	});

	it("reports a refusal with the status the server gave", async () => {
		const { api } = clientAnswering({ status: 500 });
		await expect(
			api.addClass({ number: "1", description: "" }),
		).rejects.toMatchObject({
			name: "ApiError",
			failure: "status",
			status: 500,
		});
	});

	it("reports a network failure", async () => {
		const transport: Transport = async () => {
			throw new TypeError("Failed to fetch");
		};
		const api = createClient({ ...bases, transport });
		await expect(api.getCourses()).rejects.toMatchObject({
			failure: "network",
		});
	});

	it("gives up when the server takes too long", async () => {
		vi.useFakeTimers();
		const transport: Transport = (_request, signal) =>
			new Promise((_resolve, reject) => {
				signal.addEventListener("abort", () =>
					reject(new DOMException("aborted", "AbortError")),
				);
			});
		const api = createClient({ ...bases, transport, timeoutMs: 1000 });
		const outcome = expect(api.getCourses()).rejects.toMatchObject({
			failure: "timeout",
		});
		await vi.advanceTimersByTimeAsync(1000);
		await outcome;
	});
});

describe("requests", () => {
	it("asks the lookup address for the courses", async () => {
		const { api, requests } = clientAnswering({ body: "[]" });
		await api.getCourses();
		expect(requests).toEqual([
			{ method: "GET", url: "https://lookup.test/get_course.php" },
		]);
	});

	it("asks the lookup address for the students of a course, encoding the id", async () => {
		const { api, requests } = clientAnswering({ body: "[]" });
		await api.getStudents("1 2");
		expect(requests[0]).toEqual({
			method: "GET",
			url: "https://lookup.test/get_students_by_course.php?courseId=1%202",
		});
	});

	it("posts the credentials and the account type to log in", async () => {
		const { api, requests } = clientAnswering({ body: "{}" });
		await api.login({ id: "ada", password: "secret", account: "student" });
		expect(requests[0]).toEqual({
			method: "POST",
			url: "https://api.test/v/login.php",
			form: [
				["ID", "ada"],
				["password", "secret"],
				["slider2", "student"],
			],
		});
	});

	it("sends four fields under the name name to sign up", async () => {
		const { api, requests } = clientAnswering({ body: "{}" });
		await api.signup({
			id: "ada",
			password: "secret",
			confirmation: "secret",
			name: "Ada",
			email: "ada@example.test",
			phone: "555",
			account: "Prof",
		});
		expect(requests[0]?.form).toEqual([
			["ID", "ada"],
			["password", "secret"],
			["name", "secret"],
			["name", "Ada"],
			["name", "ada@example.test"],
			["name", "555"],
			["Type", "Prof"],
		]);
	});

	it("posts the class number and description", async () => {
		const { api, requests } = clientAnswering();
		await api.addClass({ number: "101", description: "Intro" });
		expect(requests[0]).toEqual({
			method: "POST",
			url: "https://api.test/v/adduser.php",
			form: [
				["class", "101"],
				["description", "Intro"],
			],
		});
	});

	it("posts the marks, then the percentages, with the course first", async () => {
		const { api, requests } = clientAnswering();
		await api.saveMarks("2", every(60));
		await api.savePercentages("2", every(60));
		expect(requests[0]?.url).toBe("https://api.test/v/save_marks_setting.php");
		expect(requests[0]?.form).toEqual([["courseId", "2"], ...marksFields]);
		expect(requests[1]?.url).toBe(
			"https://api.test/v/save_percentage_setting.php",
		);
		expect(requests[1]?.form).toEqual([
			["courseId", "2"],
			...categories.map((name) => [`P${name}`, "60"]),
		]);
	});

	it("posts each grade's range as a start and an end", async () => {
		const { api, requests } = clientAnswering();
		const ranges: GradeRanges = {
			A: { start: 90, end: 100 },
			B: { start: 80, end: 89 },
			C: { start: 70, end: 79 },
			D: { start: 60, end: 69 },
			F: { start: 0, end: 59 },
		};
		await api.saveGradeScale("1", ranges);
		expect(requests[0]?.url).toBe("https://api.test/v/save_grade_setting.php");
		expect(requests[0]?.form).toEqual([
			["courseId", "1"],
			["ARangeStart", "90"],
			["ARangeEnd", "100"],
			["BRangeStart", "80"],
			["BRangeEnd", "89"],
			["CRangeStart", "70"],
			["CRangeEnd", "79"],
			["DRangeStart", "60"],
			["DRangeEnd", "69"],
			["FRangeStart", "0"],
			["FRangeEnd", "59"],
		]);
	});

	it("posts the course, the student and the marks to compute a grade", async () => {
		const { api, requests } = clientAnswering({
			body: '{"grade":"B","percentage":"81","totalMarks":"400"}',
		});
		await api.computeAndSave({
			courseId: "1",
			studentId: "7",
			marks: every(60),
		});
		await api.estimate({ courseId: "1", studentId: "7", marks: every(60) });
		const expected = [["CourseId", "1"], ["StudentId", "7"], ...marksFields];
		expect(requests[0]?.url).toBe(
			"https://api.test/v/compute_and_save_grade.php",
		);
		expect(requests[0]?.form).toEqual(expected);
		expect(requests[1]?.url).toBe("https://api.test/v/computegradestudent.php");
		expect(requests[1]?.form).toEqual(expected);
	});

	it("asks for a student's grades without saying whose", async () => {
		const { api, requests } = clientAnswering({
			body: JSON.stringify({
				Homework: "90",
				Labs: "80",
				Project: "70",
				Presentation: "60",
				Midterm: "50",
				Final: "40",
				Grade: "B",
			}),
		});
		expect(await api.getStudentGrades()).toEqual({
			marks: {
				Homework: "90",
				Labs: "80",
				Project: "70",
				Presentation: "60",
				Midterm: "50",
				Final: "40",
			},
			grade: "B",
		});
		expect(requests[0]).toEqual({
			method: "GET",
			url: "https://api.test/v/student.php",
		});
	});
});

describe("replies", () => {
	it.each([
		['{"status":"Prof"}', true],
		['{"status":"Student"}', false],
		['{"status":"False"}', false],
		["<html>not json</html>", false],
		["[]", false],
		["", false],
	])("treats the login reply %s as professor: %s", async (body, professor) => {
		const { api } = clientAnswering({ body });
		const reply = await api.login({
			id: "a",
			password: "b",
			account: "student",
		});
		expect(reply).toEqual({ professor });
	});

	it.each([
		['{"status":"True"}', true],
		['{"status":"False"}', false],
		["nonsense", false],
	])("treats the sign-up reply %s as created: %s", async (body, created) => {
		const { api } = clientAnswering({ body });
		const reply = await api.signup({
			id: "a",
			password: "b",
			confirmation: "b",
			name: "c",
			email: "d",
			phone: "e",
			account: "Student",
		});
		expect(reply).toEqual({ created });
	});

	it("reads courses and students, whether ids are text or numbers", async () => {
		const courses = clientAnswering({
			body: '[{"ID":1,"CourseName":"CMPE 235"},{"ID":"2","CourseName":"ENGR 297"}]',
		});
		expect(await courses.api.getCourses()).toEqual([
			{ id: "1", name: "CMPE 235" },
			{ id: "2", name: "ENGR 297" },
		]);
		const students = clientAnswering({
			body: '[{"ID":"7","FirstName":"Ada","LastName":"Lovelace"}]',
		});
		expect(await students.api.getStudents("1")).toEqual([
			{ id: "7", name: "Ada Lovelace" },
		]);
	});

	it.each([
		["not JSON", "<html>"],
		["not a list", '{"ID":"1"}'],
		["a course without a name", '[{"ID":"1"}]'],
		["a course that is not an object", "[1]"],
	])("refuses a list of courses that is %s", async (_why, body) => {
		const { api } = clientAnswering({ body });
		await expect(api.getCourses()).rejects.toMatchObject({ failure: "shape" });
	});

	it("reads a computed grade, whether the numbers are text or numbers", async () => {
		const { api } = clientAnswering({
			body: '{"grade":"B","percentage":81,"totalMarks":400}',
		});
		expect(
			await api.computeAndSave({
				courseId: "1",
				studentId: "7",
				marks: every(0),
			}),
		).toEqual({ grade: "B", percentage: "81", totalMarks: "400" });
	});

	it.each([
		["a missing field", '{"grade":"B","percentage":"81"}'],
		[
			"a field that is not text",
			'{"grade":"B","percentage":"81","totalMarks":null}',
		],
		["no JSON", "oops"],
	])("refuses a computed grade with %s", async (_why, body) => {
		const { api } = clientAnswering({ body });
		await expect(
			api.computeAndSave({ courseId: "1", studentId: "7", marks: every(0) }),
		).rejects.toMatchObject({ failure: "shape" });
	});

	it("reads an estimate", async () => {
		const { api } = clientAnswering({
			body: '{"grade":"C","percentage":"72"}',
		});
		expect(
			await api.estimate({ courseId: "1", studentId: "1", marks: every(72) }),
		).toEqual({ grade: "C", percentage: "72" });
	});

	it("does not read the answer to a save", async () => {
		const { api } = clientAnswering({ body: "anything at all" });
		await expect(api.saveMarks("1", every(10))).resolves.toBeUndefined();
	});
});
