$(() => {
	$("#gr").on("submit", (e) => {
		e.preventDefault();
		$.ajax({
			type: "post",
			url: "http://rubypals.com/phonegapstyle/phpcode/computegradestudent.php",
			data: $("#gr").serialize(),
			error: () => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"The grade could not be estimated. Please try again.";
			},
			success: (data) => {
				document.getElementById("totalMarksSaveStatus").textContent =
					"Estimated Grade is :" +
					data.grade +
					"\n\n Percentage :" +
					data.percentage;
			},
		});
	});
});
