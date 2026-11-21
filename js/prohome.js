$(() => {
	$("#gr").on("submit", (e) => {
		e.preventDefault();
		$.ajax({
			type: "post",
			url: "http://rubypals.com/phonegapstyle/phpcode/adduser.php",
			data: $("#gr").serialize(),
			error: () => {
				alert("The class could not be added. Please try again.");
			},
			success: () => {
				alert("Class added!");
			},
		});
	});
});
