import { asText, isRecord, parseJson, shapeError, textFields } from "./guards";
import type { Send } from "./sender";
import {
	type Course,
	categories,
	type Estimate,
	type GradeRanges,
	type GradeResult,
	gradeLetters,
	type LoginAccount,
	type PerCategory,
	type SignupAccount,
	type Student,
	type StudentGrades,
} from "./types";

type Entries = ReadonlyArray<readonly [string, string]>;

export interface Bases {
	/** Everything except the two lookups. */
	apiBase: string;
	/** get_course.php and get_students_by_course.php. */
	lookupBase: string;
}

function perCategory(prefix: "M" | "P", values: PerCategory): Entries {
	return categories.map((name) => [`${prefix}${name}`, String(values[name])]);
}

function gradeFields(
	courseId: string,
	studentId: string,
	marks: PerCategory,
): Entries {
	return [
		["CourseId", courseId],
		["StudentId", studentId],
		...perCategory("M", marks),
	];
}

/**
 * The status the server put in its answer, if it sent one. Login and sign-up
 * read it from whatever came back, so a reply that is not JSON has none.
 */
function replyStatus(body: string): string | undefined {
	try {
		const reply: unknown = JSON.parse(body);
		return isRecord(reply) ? asText(reply.status) : undefined;
	} catch {
		return undefined;
	}
}

/** One method per endpoint in docs/api-contract.md. */
export function createApi(send: Send, bases: Bases) {
	const post = (endpoint: string, form: Entries) =>
		send({ method: "POST", url: `${bases.apiBase}${endpoint}`, form });
	const lookup = (endpoint: string, query = "") =>
		send({ method: "GET", url: `${bases.lookupBase}${endpoint}${query}` });

	return {
		/** Only a status of "Prof" is a professor; see B1 in the notes. */
		async login(fields: {
			id: string;
			password: string;
			account: LoginAccount;
		}): Promise<{ professor: boolean }> {
			const body = await post("login.php", [
				["ID", fields.id],
				["password", fields.password],
				["slider2", fields.account],
			]);
			return { professor: replyStatus(body) === "Prof" };
		},

		/** Sends four fields under the name "name"; see B4 in the notes. */
		async signup(fields: {
			id: string;
			password: string;
			confirmation: string;
			name: string;
			email: string;
			phone: string;
			account: SignupAccount;
		}): Promise<{ created: boolean }> {
			const body = await post("signup.php", [
				["ID", fields.id],
				["password", fields.password],
				["name", fields.confirmation],
				["name", fields.name],
				["name", fields.email],
				["name", fields.phone],
				["Type", fields.account],
			]);
			return { created: replyStatus(body) === "True" };
		},

		async addClass(fields: {
			number: string;
			description: string;
		}): Promise<void> {
			await post("adduser.php", [
				["class", fields.number],
				["description", fields.description],
			]);
		},

		async getCourses(): Promise<Course[]> {
			const what = "a list of courses";
			const list = parseJson(await lookup("get_course.php"), what);
			if (!Array.isArray(list)) throw shapeError(what);
			return list.map((item: unknown) => {
				const course = textFields(item, ["ID", "CourseName"], what);
				return { id: course.ID, name: course.CourseName };
			});
		},

		async getStudents(courseId: string): Promise<Student[]> {
			const what = "a list of students";
			const query = `?courseId=${encodeURIComponent(courseId)}`;
			const list = parseJson(
				await lookup("get_students_by_course.php", query),
				what,
			);
			if (!Array.isArray(list)) throw shapeError(what);
			return list.map((item: unknown) => {
				const student = textFields(item, ["ID", "FirstName", "LastName"], what);
				return {
					id: student.ID,
					name: `${student.FirstName} ${student.LastName}`,
				};
			});
		},

		async saveMarks(courseId: string, marks: PerCategory): Promise<void> {
			await post("save_marks_setting.php", [
				["courseId", courseId],
				...perCategory("M", marks),
			]);
		},

		/** The server refuses percentages that do not total 100. */
		async savePercentages(
			courseId: string,
			weights: PerCategory,
		): Promise<void> {
			await post("save_percentage_setting.php", [
				["courseId", courseId],
				...perCategory("P", weights),
			]);
		},

		async saveGradeScale(courseId: string, ranges: GradeRanges): Promise<void> {
			await post("save_grade_setting.php", [
				["courseId", courseId],
				...gradeLetters.flatMap((letter): Entries => {
					const { start, end } = ranges[letter];
					return [
						[`${letter}RangeStart`, String(start)],
						[`${letter}RangeEnd`, String(end)],
					];
				}),
			]);
		},

		async computeAndSave(fields: {
			courseId: string;
			studentId: string;
			marks: PerCategory;
		}): Promise<GradeResult> {
			const what = "a grade";
			const body = await post(
				"compute_and_save_grade.php",
				gradeFields(fields.courseId, fields.studentId, fields.marks),
			);
			const reply = textFields(
				parseJson(body, what),
				["grade", "percentage", "totalMarks"],
				what,
			);
			return {
				grade: reply.grade,
				percentage: reply.percentage,
				totalMarks: reply.totalMarks,
			};
		},

		async estimate(fields: {
			courseId: string;
			studentId: string;
			marks: PerCategory;
		}): Promise<Estimate> {
			const what = "an estimate";
			const body = await post(
				"computegradestudent.php",
				gradeFields(fields.courseId, fields.studentId, fields.marks),
			);
			const reply = textFields(
				parseJson(body, what),
				["grade", "percentage"],
				what,
			);
			return { grade: reply.grade, percentage: reply.percentage };
		},

		async getStudentGrades(): Promise<StudentGrades> {
			const what = "a set of grades";
			const body = await send({
				method: "GET",
				url: `${bases.apiBase}student.php`,
			});
			const reply = textFields(
				parseJson(body, what),
				[...categories, "Grade"],
				what,
			);
			const marks = Object.fromEntries(
				categories.map((name) => [name, reply[name]]),
			) as PerCategory<string>;
			return { marks, grade: reply.Grade };
		},
	};
}

export type Api = ReturnType<typeof createApi>;
