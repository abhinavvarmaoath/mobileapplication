export interface Student {
	ID: string;
	FirstName: string;
	LastName: string;
}

export const courses = [
	{ ID: "1", CourseName: "CMPE 235" },
	{ ID: "2", CourseName: "ENGR 297" },
];

export const studentsByCourse: Record<string, Student[]> = {
	"1": [
		{ ID: "7", FirstName: "Ada", LastName: "Lovelace" },
		{ ID: "8", FirstName: "Alan", LastName: "Turing" },
	],
	"2": [{ ID: "9", FirstName: "Grace", LastName: "Hopper" }],
};

export const studentGrades = {
	Homework: "90",
	Labs: "80",
	Project: "70",
	Presentation: "60",
	Midterm: "50",
	Final: "40",
	Grade: "B",
};

/** The developer's machine that the pages still link to (see B9). */
export const localSite = "file:///Users/leona/hello/www/";
