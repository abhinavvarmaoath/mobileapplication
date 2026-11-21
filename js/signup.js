// jQuery Mobile forces autocomplete="off" on the inputs it enhances, so
// remember what the markup asked for and put it back afterwards.
$(document).on("pagebeforecreate", () => {
	$("input[autocomplete]").each(function () {
		$(this).data("autocomplete", this.getAttribute("autocomplete"));
	});
});
$(document).on("pagecreate", () => {
	$("input").each(function () {
		var wanted = $(this).data("autocomplete");
		if (wanted) this.setAttribute("autocomplete", wanted);
	});
});
$(() => {
	$("#gr").on("submit", (e) => {
		e.preventDefault();
		$.ajax({
			type: "post",
			url: "http://rubypals.com/phonegapstyle/phpcode/signup.php",
			data: $("#gr").serialize(),
			success: (data) => {
				if (data.status === "True") {
					window.location.href = "index.html";
				}
			},
		});
	});
});
