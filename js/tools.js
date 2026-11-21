// Third-party tools are links to the addresses in js/config.js and open in a
// new tab, so nothing from those sites runs inside this page.
$(document).on("pagebeforecreate", () => {
	$("[data-tool]").each(function () {
		const address = EasyGrader.tools[this.dataset.tool];
		if (!address) {
			$(this).remove();
			return;
		}
		this.href = address;
		this.target = "_blank";
		this.rel = "noopener noreferrer";
	});
});
