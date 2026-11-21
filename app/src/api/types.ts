// The six grading categories, in the order the forms and requests list them.
// Everything that repeats per category is built from this one list.
export const categories = [
	"Homework",
	"Labs",
	"Project",
	"Presentation",
	"Midterm",
	"Final",
] as const;
export type Category = (typeof categories)[number];

export const gradeLetters = ["A", "B", "C", "D", "F"] as const;
export type GradeLetter = (typeof gradeLetters)[number];

export type PerCategory<T = number> = Record<Category, T>;
export type GradeRanges = Record<GradeLetter, { start: number; end: number }>;

export interface Course {
	id: string;
	name: string;
}

export interface Student {
	id: string;
	name: string;
}

export interface Estimate {
	grade: string;
	percentage: string;
}

export interface GradeResult extends Estimate {
	totalMarks: string;
}

export interface StudentGrades {
	marks: PerCategory<string>;
	grade: string;
}

export type LoginAccount = "student" | "professor";
export type SignupAccount = "Student" | "Prof";
