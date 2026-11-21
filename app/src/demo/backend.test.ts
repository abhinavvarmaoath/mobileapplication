import { describe, expect, it } from "vitest";
import { createClient } from "../api";
import { categories, type GradeRanges, type PerCategory } from "../api/types";
import {
	createDemoTransport,
	createSessionStore,
	type DemoState,
} from "./backend";

function demo() {
	let state: DemoState = {};
	const store = {
		read: () => structuredClone(state),
		write: (next: DemoState) => {
			state = structuredClone(next);
		},
	};
	const api = createClient({
		apiBase: "https://demo.test/api/",
		lookupBase: "https://demo.test/lookup/",
		transport: createDemoTransport(store, 0),
	});
	return { api, store, state: () => state };
}

const every = (value: number) =>
	Object.fromEntries(categories.map((name) => [name, value])) as PerCategory;

const ranges: GradeRanges = {
	A: { start: 90, end: 100 },
	B: { start: 80, end: 89 },
	C: { start: 70, end: 79 },
	D: { start: 60, end: 69 },
	F: { start: 0, end: 59 },
};

describe("the demo backend, used through the real client", () => {
	it("sends a professor and a student to their own homes", async () => {
		const { api } = demo();
		expect(
			await api.login({ id: "a", password: "b", account: "professor" }),
		).toEqual({ professor: true });
		expect(
			await api.login({ id: "a", password: "b", account: "student" }),
		).toEqual({ professor: false });
	});

	it("accepts any sign-up", async () => {
		const { api } = demo();
		const reply = await api.signup({
			id: "a",
			password: "b",
			confirmation: "b",
			name: "c",
			email: "d@e.test",
			phone: "1",
			account: "Student",
		});
		expect(reply).toEqual({ created: true });
	});

	it("lists two courses and the students of each", async () => {
		const { api } = demo();
		expect(await api.getCourses()).toEqual([
			{ id: "1", name: "CMPE 235" },
			{ id: "2", name: "ENGR 297" },
		]);
		expect((await api.getStudents("1")).map((s) => s.name)).toEqual([
			"Ada Lovelace",
			"Alan Turing",
		]);
		expect(await api.getStudents("99")).toEqual([]);
	});

	it("adds a class to the course list and remembers it", async () => {
		const { api, state } = demo();
		await api.addClass({ number: "CS 101", description: "Intro" });
		await api.addClass({ number: "CS 102", description: "More" });
		expect((await api.getCourses()).map((c) => c.name)).toEqual([
			"CMPE 235",
			"ENGR 297",
			"CS 101",
			"CS 102",
		]);
		expect(state().classes).toHaveLength(2);
	});

	it("refuses percentages that do not total 100 and keeps ones that do", async () => {
		const { api, state } = demo();
		await expect(api.savePercentages("1", every(60))).rejects.toMatchObject({
			failure: "status",
			status: 400,
		});
		expect(state().weights).toBeUndefined();
		await api.savePercentages("1", { ...every(0), Homework: 100 });
		expect(state().weights?.["1"]?.Homework).toBe(100);
	});

	it("grades with the default weights and ranges when none are saved", async () => {
		const { api } = demo();
		expect(
			await api.computeAndSave({
				courseId: "1",
				studentId: "7",
				marks: every(60),
			}),
		).toEqual({
			grade: "D",
			percentage: "60",
			totalMarks: "360",
		});
	});

	it("grades with the course's saved weights", async () => {
		const { api } = demo();
		await api.savePercentages("1", { ...every(0), Homework: 100 });
		const result = await api.computeAndSave({
			courseId: "1",
			studentId: "7",
			marks: { ...every(0), Homework: 80 },
		});
		expect(result).toEqual({ grade: "B", percentage: "80", totalMarks: "80" });
		// Another course still uses the defaults.
		const other = await api.computeAndSave({
			courseId: "2",
			studentId: "9",
			marks: { ...every(0), Homework: 80 },
		});
		expect(other.percentage).toBe("16");
	});

	it("grades with the course's saved ranges, and a percentage between two ranges gets the lower grade", async () => {
		const { api } = demo();
		await api.saveGradeScale("1", { ...ranges, A: { start: 50, end: 100 } });
		const result = await api.estimate({
			courseId: "1",
			studentId: "1",
			marks: every(55),
		});
		expect(result.grade).toBe("A");
		const gap = await demo().api.estimate({
			courseId: "1",
			studentId: "1",
			marks: every(89.5),
		});
		expect(gap.grade).toBe("B");
	});

	it("shows one student's grades", async () => {
		const { api } = demo();
		expect((await api.getStudentGrades()).grade).toBe("B");
	});

	it("answers an endpoint it does not know with a 404", async () => {
		const transport = createDemoTransport(
			{ read: () => ({}), write: () => {} },
			0,
		);
		const response = await transport(
			{ method: "GET", url: "https://demo.test/api/nothing.php" },
			new AbortController().signal,
		);
		expect(response.status).toBe(404);
	});

	it("stops waiting when the request is aborted", async () => {
		const transport = createDemoTransport(
			{ read: () => ({}), write: () => {} },
			10_000,
		);
		const controller = new AbortController();
		const pending = transport(
			{ method: "GET", url: "https://demo.test/api/student.php" },
			controller.signal,
		);
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: "AbortError" });
	});
});

describe("the session store", () => {
	it("reads back what it wrote", () => {
		const data = new Map<string, string>();
		const store = createSessionStore({
			getItem: (key) => data.get(key) ?? null,
			setItem: (key, value) => void data.set(key, value),
		});
		store.write({ classes: [{ id: "3", name: "X" }] });
		expect(store.read()).toEqual({ classes: [{ id: "3", name: "X" }] });
	});

	it("starts empty, and carries on when storage is refused or holds rubbish", () => {
		const broken = createSessionStore({
			getItem: () => "{not json",
			setItem: () => {
				throw new Error("refused");
			},
		});
		expect(broken.read()).toEqual({});
		expect(() => broken.write({})).not.toThrow();
	});
});
