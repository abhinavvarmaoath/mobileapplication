$(document).on("pagebeforecreate", () => {
	$.getJSON(`${EasyGrader.lookupBase}get_course.php`, (data) => {
		$.each(data, (_key, value) => {
			$("<option></option>")
				.val(value.ID)
				.text(value.CourseName)
				.appendTo("#course");
		});
	});
});
$(() => {
	$("#course").on("change", function () {
		$("#CourseId").val(this.value);
	});
	$("#gr").on("submit", (e) => {
		e.preventDefault();
		if (!$("#CourseId").val()) {
			document.getElementById("totalMarksSaveStatus").textContent =
				"Choose a course first.";
			return;
		}
		$.ajax({
			type: "post",
			url: `${EasyGrader.apiBase}save_marks_setting.php`,
			data: $("#gr").serialize(),
			error: () => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"Marks could not be saved. Please try again.";
			},
			success: () => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"Marks saved successfully";
			},
		});
	});
});
