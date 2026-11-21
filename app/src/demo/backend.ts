import type { ApiRequest, ApiResponse, Transport } from "../api/transport";
import {
	type Course,
	categories,
	type GradeLetter,
	type GradeRanges,
	gradeLetters,
	type PerCategory,
} from "../api/types";

// Stands in for the backend when the config sets demo, so the app works where
// there is none. The replies follow docs/api-contract.md; what the real server
// does beyond that is not known.

export interface DemoState {
	classes?: Course[];
	weights?: Record<string, PerCategory>;
	ranges?: Record<string, GradeRanges>;
}

/** Where added classes and saved settings are kept between requests. */
export interface DemoStore {
	read(): DemoState;
	write(state: DemoState): void;
}

const courses: Course[] = [
	{ id: "1", name: "CMPE 235" },
	{ id: "2", name: "ENGR 297" },
];

const students: Record<
	string,
	Array<{ ID: string; FirstName: string; LastName: string }>
> = {
	"1": [
		{ ID: "7", FirstName: "Ada", LastName: "Lovelace" },
		{ ID: "8", FirstName: "Alan", LastName: "Turing" },
	],
	"2": [{ ID: "9", FirstName: "Grace", LastName: "Hopper" }],
};

const defaultWeights: PerCategory = {
	Homework: 20,
	Labs: 20,
	Project: 20,
	Presentation: 10,
	Midterm: 15,
	Final: 15,
};

const defaultRanges: GradeRanges = {
	A: { start: 90, end: 100 },
	B: { start: 80, end: 89 },
	C: { start: 70, end: 79 },
	D: { start: 60, end: 69 },
	F: { start: 0, end: 59 },
};

interface Call {
	form: Record<string, string>;
	query: URLSearchParams;
	state: DemoState;
}

type Handler = (call: Call) => { status: number; body: unknown };

const ok = { status: 200, body: { status: "True" } };

/** The highest grade whose range starts at or below the percentage. */
function gradeFor(percentage: number, ranges: GradeRanges): GradeLetter {
	const byStart = [...gradeLetters].sort(
		(a, b) => ranges[b].start - ranges[a].start,
	);
	return byStart.find((letter) => percentage >= ranges[letter].start) ?? "F";
}

function compute({ form, state }: Call) {
	const weights = state.weights?.[form.CourseId ?? ""] ?? defaultWeights;
	const marks = categories.map((name) => Number(form[`M${name}`]) || 0);
	const percentage = categories.reduce(
		(sum, name, i) => sum + ((marks[i] ?? 0) * weights[name]) / 100,
		0,
	);
	const ranges = state.ranges?.[form.CourseId ?? ""] ?? defaultRanges;
	return {
		grade: gradeFor(percentage, ranges),
		percentage: String(Math.round(percentage * 10) / 10),
		totalMarks: String(marks.reduce((sum, mark) => sum + mark, 0)),
	};
}

const handlers: Record<string, Handler> = {
	"login.php": ({ form }) => ({
		status: 200,
		body: { status: form.slider2 === "professor" ? "Prof" : "Student" },
	}),
	"signup.php": () => ok,
	"adduser.php": ({ form, state }) => {
		const added = state.classes ?? [];
		const id = String(courses.length + added.length + 1);
		state.classes = [...added, { id, name: form.class ?? "" }];
		return ok;
	},
	"get_course.php": ({ state }) => ({
		status: 200,
		body: [...courses, ...(state.classes ?? [])].map((course) => ({
			ID: course.id,
			CourseName: course.name,
		})),
	}),
	"get_students_by_course.php": ({ query }) => ({
		status: 200,
		body: students[query.get("courseId") ?? ""] ?? [],
	}),
	"save_marks_setting.php": () => ok,
	"save_percentage_setting.php": ({ form, state }) => {
		const weights = Object.fromEntries(
			categories.map((name) => [name, Number(form[`P${name}`]) || 0]),
		) as PerCategory;
		const total = categories.reduce((sum, name) => sum + weights[name], 0);
		// The pages read any refusal as "does not total 100%".
		if (total !== 100) return { status: 400, body: {} };
		state.weights = { ...state.weights, [form.courseId ?? ""]: weights };
		return ok;
	},
	"save_grade_setting.php": ({ form, state }) => {
		const ranges = Object.fromEntries(
			gradeLetters.map((letter) => [
				letter,
				{
					start: Number(form[`${letter}RangeStart`]),
					end: Number(form[`${letter}RangeEnd`]),
				},
			]),
		) as GradeRanges;
		state.ranges = { ...state.ranges, [form.courseId ?? ""]: ranges };
		return ok;
	},
	"compute_and_save_grade.php": (call) => ({
		status: 200,
		body: compute(call),
	}),
	"computegradestudent.php": (call) => {
		const { grade, percentage } = compute(call);
		return { status: 200, body: { grade, percentage } };
	},
	"student.php": () => ({
		status: 200,
		body: {
			Homework: "90",
			Labs: "80",
			Project: "70",
			Presentation: "60",
			Midterm: "50",
			Final: "40",
			Grade: "B",
		},
	}),
};

function answer(request: ApiRequest, store: DemoStore): ApiResponse {
	const url = new URL(request.url);
	const handler = handlers[url.pathname.split("/").pop() ?? ""];
	if (!handler) return { status: 404, body: "" };
	// With duplicate names the last wins, as it does in PHP.
	const form = Object.fromEntries(request.form ?? []);
	const state = store.read();
	const { status, body } = handler({ form, query: url.searchParams, state });
	store.write(state);
	return { status, body: JSON.stringify(body) };
}

/** A pause, so the pages behave as they do with a server. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted)
			return reject(new DOMException("aborted", "AbortError"));
		const timer = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(new DOMException("aborted", "AbortError"));
		});
	});
}

export function createDemoTransport(
	store: DemoStore,
	delayMs = 150,
): Transport {
	return async (request, signal) => {
		await pause(delayMs, signal);
		return answer(request, store);
	};
}

/** Keeps the state for the browser session. Storage can be refused. */
export function createSessionStore(
	storage: Pick<Storage, "getItem" | "setItem">,
	key = "easy-grader-demo",
): DemoStore {
	return {
		read() {
			try {
				return (JSON.parse(storage.getItem(key) ?? "{}") as DemoState) ?? {};
			} catch {
				return {};
			}
		},
		write(state) {
			try {
				storage.setItem(key, JSON.stringify(state));
			} catch {
				// The demo then forgets between pages.
			}
		},
	};
}
