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
function gradeRangesOverlap() {
	const ranges = [];
	$.each(["A", "B", "C", "D", "F"], (_index, grade) => {
		ranges.push({
			start: Number($(`#${grade}RangeStart`).val()),
			end: Number($(`#${grade}RangeEnd`).val()),
		});
	});
	for (let i = 0; i < ranges.length; i++) {
		for (let j = i + 1; j < ranges.length; j++) {
			if (ranges[i].start <= ranges[j].end && ranges[j].start <= ranges[i].end)
				return true;
		}
	}
	return false;
}
$(() => {
	$("#course").on("change", function () {
		$("#courseId").val(this.value);
	});
	$("#gr").on("submit", (e) => {
		e.preventDefault();
		if (!$("#courseId").val()) {
			document.getElementById("gcSaveStatus").textContent =
				"Choose a course first.";
			return;
		}
		if (gradeRangesOverlap()) {
			document.getElementById("gcSaveStatus").textContent =
				"Grade ranges must not overlap.";
			return;
		}
		$.ajax({
			type: "post",
			url: "http://rubypals.com/phonegapstyle/phpcode/save_grade_setting.php",
			data: $("#gr").serialize(),
			error: () => {
				document.getElementById("gcSaveStatus").textContent =
					"Grade settings could not be saved. Please try again.";
			},
			success: () => {
				document.getElementById("gcSaveStatus").textContent =
					"Grade Settings Saved";
			},
		});
	});
});
