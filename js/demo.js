// Stands in for the backend when js/config.js sets demo to true, so the pages
// work where there is none, such as on GitHub Pages. Nothing leaves the
// browser. Classes added and settings saved are kept for the browser session.
// The replies follow docs/api-contract.md; what the real server does beyond
// that is not known.
(() => {
	if (!EasyGrader.demo) return;

	const stateKey = "easy-grader-demo";
	const categories = [
		"Homework",
		"Labs",
		"Project",
		"Presentation",
		"Midterm",
		"Final",
	];
	const courses = [
		{ ID: "1", CourseName: "CMPE 235" },
		{ ID: "2", CourseName: "ENGR 297" },
	];
	const students = {
		1: [
			{ ID: "7", FirstName: "Ada", LastName: "Lovelace" },
			{ ID: "8", FirstName: "Alan", LastName: "Turing" },
		],
		2: [{ ID: "9", FirstName: "Grace", LastName: "Hopper" }],
	};
	const defaultWeights = {
		Homework: 20,
		Labs: 20,
		Project: 20,
		Presentation: 10,
		Midterm: 15,
		Final: 15,
	};
	const defaultRanges = {
		A: [90, 100],
		B: [80, 89],
		C: [70, 79],
		D: [60, 69],
		F: [0, 59],
	};
	const ok = { status: "True" };

	function readState() {
		try {
			return JSON.parse(sessionStorage.getItem(stateKey)) ?? {};
		} catch {
			return {};
		}
	}

	function writeState(state) {
		try {
			sessionStorage.setItem(stateKey, JSON.stringify(state));
		} catch {
			// Storage can be refused; the demo then forgets between pages.
		}
	}

	// The highest grade whose range starts at or below the percentage, so a
	// percentage between two ranges still gets one.
	function gradeFor(percentage, ranges) {
		const byStart = Object.entries(ranges).sort(([, a], [, b]) => b[0] - a[0]);
		const match = byStart.find(([, [start]]) => percentage >= start);
		return match ? match[0] : "F";
	}

	function compute(form, state) {
		const weights = state.weights?.[form.CourseId] ?? defaultWeights;
		const marks = categories.map((name) => Number(form[`M${name}`]) || 0);
		const percentage = categories.reduce(
			(sum, name, i) => sum + (marks[i] * weights[name]) / 100,
			0,
		);
		return {
			grade: gradeFor(
				percentage,
				state.ranges?.[form.CourseId] ?? defaultRanges,
			),
			percentage: String(Math.round(percentage * 10) / 10),
			totalMarks: String(marks.reduce((sum, mark) => sum + mark, 0)),
		};
	}

	// Each handler gets the form fields, the query and the saved state, and
	// returns the status and the body.
	const endpoints = {
		"login.php": (form) => [
			200,
			{ status: form.slider2 === "professor" ? "Prof" : "Student" },
		],
		"signup.php": () => [200, ok],
		"adduser.php": (form, _query, state) => {
			const added = state.classes ?? [];
			state.classes = [
				...added,
				{
					ID: String(courses.length + added.length + 1),
					CourseName: form.class,
				},
			];
			return [200, ok];
		},
		"get_course.php": (_form, _query, state) => [
			200,
			// Classes added by a page on the new stack are stored as {id, name}.
			[
				...courses,
				...(state.classes ?? []).map((added) => ({
					ID: added.ID ?? added.id,
					CourseName: added.CourseName ?? added.name,
				})),
			],
		],
		"get_students_by_course.php": (_form, query) => [
			200,
			students[query.courseId] ?? [],
		],
		"save_marks_setting.php": () => [200, ok],
		"save_percentage_setting.php": (form, _query, state) => {
			const weights = Object.fromEntries(
				categories.map((name) => [name, Number(form[`P${name}`]) || 0]),
			);
			const total = Object.values(weights).reduce((sum, p) => sum + p, 0);
			// The page treats any refusal as "does not total 100%".
			if (total !== 100) return [400, {}];
			state.weights = { ...state.weights, [form.courseId]: weights };
			return [200, ok];
		},
		"save_grade_setting.php": (form, _query, state) => {
			const ranges = Object.fromEntries(
				["A", "B", "C", "D", "F"].map((grade) => [
					grade,
					[
						Number(form[`${grade}RangeStart`]),
						Number(form[`${grade}RangeEnd`]),
					],
				]),
			);
			state.ranges = { ...state.ranges, [form.courseId]: ranges };
			return [200, ok];
		},
		"compute_and_save_grade.php": (form, _query, state) => [
			200,
			compute(form, state),
		],
		"computegradestudent.php": (form, _query, state) => {
			const { grade, percentage } = compute(form, state);
			return [200, { grade, percentage }];
		},
		"student.php": () => [
			200,
			{
				Homework: "90",
				Labs: "80",
				Project: "70",
				Presentation: "60",
				Midterm: "50",
				Final: "40",
				Grade: "B",
			},
		],
	};

	$.ajaxTransport("+*", (options) => {
		const isBackend = [EasyGrader.apiBase, EasyGrader.lookupBase].some((base) =>
			options.url.startsWith(base),
		);
		if (!isBackend) return undefined;
		let timer;
		return {
			send: (_headers, complete) => {
				// A short pause, so the pages behave as they do with a server.
				timer = setTimeout(() => {
					const url = new URL(options.url);
					const handler = endpoints[url.pathname.split("/").pop()];
					if (!handler) return complete(404, "Not Found", {}, "");
					const state = readState();
					const [status, body] = handler(
						Object.fromEntries(new URLSearchParams(options.data ?? "")),
						Object.fromEntries(url.searchParams),
						state,
					);
					writeState(state);
					complete(
						status,
						status === 200 ? "OK" : "Bad Request",
						{ text: JSON.stringify(body) },
						"Content-Type: application/json",
					);
				}, 150);
			},
			abort: () => clearTimeout(timer),
		};
	});
})();
