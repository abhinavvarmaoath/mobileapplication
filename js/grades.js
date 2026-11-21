$(document).ready(() => {
	$.ajax({
		type: "get",
		url: `${EasyGrader.apiBase}student.php`,
		success: (data) => {
			document.getElementById("finalHomeworks").textContent = data.Homework;
			document.getElementById("finalLabs").textContent = data.Labs;
			document.getElementById("finalProject").textContent = data.Project;
			document.getElementById("finalPresentation").textContent =
				data.Presentation;
			document.getElementById("finalMidterm").textContent = data.Midterm;
			document.getElementById("final").textContent = data.Final;
			document.getElementById("finalGrade").textContent = data.Grade;
		},
	});
});
