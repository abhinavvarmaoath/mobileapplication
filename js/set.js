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
			url: "http://rubypals.com/phonegapstyle/phpcode/save_marks_setting.php",
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
