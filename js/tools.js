// Third-party tools are links to the addresses in js/config.js. They open in a
// new tab, so nothing from those sites runs inside this page. With embedTools
// set they open in a sandboxed frame in a popup instead.
(() => {
	const permissions = { video: "camera; microphone; fullscreen" };

	function linkTo(trigger, address) {
		trigger.href = address;
		trigger.target = "_blank";
		trigger.rel = "noopener noreferrer";
	}

	// The frame exists only while the popup is open, so nothing is requested
	// until the visitor asks, and closing the popup ends a call.
	function embed(trigger, address, number) {
		const id = `tool-popup-${number}`;
		trigger.href = `#${id}`;
		trigger.dataset.rel = "popup";
		trigger.dataset.positionTo = "window";
		const popup = $(
			'<div data-role="popup" data-overlay-theme="b" data-theme="a" data-tolerance="15,15" class="ui-content"></div>',
		).attr("id", id);
		popup.on("popupbeforeposition", () => {
			const frame = document.createElement("iframe");
			frame.className = "tool-frame";
			frame.title = trigger.textContent.trim();
			frame.setAttribute(
				"sandbox",
				"allow-forms allow-popups allow-same-origin allow-scripts",
			);
			frame.referrerPolicy = "no-referrer";
			const allowed = permissions[trigger.dataset.tool];
			if (allowed) frame.allow = allowed;
			frame.src = address;
			popup.append(frame);
		});
		popup.on("popupafterclose", () => popup.empty());
		$(trigger).after(popup);
	}

	$(document).on("pagebeforecreate", () => {
		$("[data-tool]").each(function (number) {
			const address = EasyGrader.tools[this.dataset.tool];
			if (!address) {
				$(this).remove();
			} else if (EasyGrader.embedTools) {
				embed(this, address, number);
			} else {
				linkTo(this, address);
			}
		});
	});
})();
