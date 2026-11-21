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
			url: `${EasyGrader.apiBase}save_percentage_setting.php`,
			data: $("#gr").serialize(),
			error: (xhr) => {
				var message =
					"Scaling Factors cannot be saved. It has to total to 100%";
				if (xhr.status === 0) {
					message = "Could not reach the server. Please try again.";
				}
				if (xhr.status === 200) {
					message = "Scaling Factors saved successfully";
				}
				document.getElementById("totalMarksSaveStatus").textContent = message;
			},
			success: () => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"Scaling Factors saved successfully";
			},
		});
	});
});
