$(document).on("pagebeforecreate", () => {
	$.getJSON("http://rubypals.com/cmpe235/phpcode/get_course.php", (data) => {
		$.each(data, (_key, value) => {
			$("<option></option>")
				.val(value.ID)
				.text(value.CourseName)
				.appendTo("#course");
		});
	});
});

function loadStudents(courseId) {
	$("#CourseId").val(courseId);
	$("#StudentId").val("");
	$("#student option:gt(0)").remove();
	if (!courseId) return;

	var url =
		"http://rubypals.com/cmpe235/phpcode/get_students_by_course.php?courseId=" +
		courseId;

	$.getJSON(url, (data) => {
		if ($("#course").val() !== courseId) return;
		$.each(data, (_key, value) => {
			$("<option></option>")
				.val(value.ID)
				.text(`${value.FirstName} ${value.LastName}`)
				.appendTo("#student");
		});
	});
}
$(() => {
	$("#course").on("change", function () {
		loadStudents(this.value);
	});
	$("#student").on("change", function () {
		$("#StudentId").val(this.value);
	});
	$("#gr").on("submit", (e) => {
		e.preventDefault();
		if (!$("#CourseId").val() || !$("#StudentId").val()) {
			document.getElementById("totalMarksSaveStatus").textContent =
				"Choose a course and a student first.";
			return;
		}
		$.ajax({
			type: "post",
			url: "http://rubypals.com/phonegapstyle/phpcode/compute_and_save_grade.php",
			data: $("#gr").serialize(),
			error: () => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"The grade could not be computed. Please try again.";
			},
			success: (data) => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"Computed Grade is :" +
					data.grade +
					"\nTotal Grade :" +
					data.percentage +
					"%" +
					"\nMarks :" +
					data.totalMarks;
			},
		});
	});
});
