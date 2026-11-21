// Where the pages find the backend and the third-party tools. Change the
// addresses here: no other file names a host. The backend endpoints are in
// docs/api-contract.md.
window.EasyGrader = {
	// When true the pages never call the backend: js/demo.js answers instead.
	// The GitHub Pages build turns this on.
	demo: false,
	// Everything except the two lookups.
	apiBase: "https://rubypals.com/phonegapstyle/phpcode/",
	// get_course.php and get_students_by_course.php.
	lookupBase: "https://rubypals.com/cmpe235/phpcode/",
	// Pages that link to a tool leave it out when its address is empty.
	tools: {
		greensheet:
			"https://openloop.com/education/classes/sjsu_engr/engr_mobile_dev/fall2015/index.php",
		materials: "https://varmapp.com/list_files.php",
		chat: "https://www.hiippoo.com/chatroom1.php?team=hello",
		video: "https://www.gruveo.com/embed/",
		student: "https://varmapp.com/",
	},
};
