# API contract as the pages use it

The backend is not in this repo. This is what the pages send and read,
taken from the page code and checked by the specs in `tests/e2e`. The server
itself has not been inspected, so anything it does beyond this is unknown.

The pages build every URL from two addresses in `js/config.js`:

- `apiBase`, `https://rubypals.com/phonegapstyle/phpcode/` by default, for
  everything except the two lookups below
- `lookupBase`, `https://rubypals.com/cmpe235/phpcode/` by default, for
  `get_course.php` and `get_students_by_course.php`

The pages used to call these over plain HTTP. HTTPS is an assumption: the
server is never contacted from here, so nobody has checked that it answers on
HTTPS. If it does not, change the two addresses.

In demo mode `js/demo.js` answers these endpoints in the browser instead.

Requests are form-encoded (`application/x-www-form-urlencoded`). Replies are
read as JSON. No request carries a session, token or user id.

| Endpoint | Method | Sent | Read from the reply | Page |
| --- | --- | --- | --- | --- |
| `login.php` | POST | `ID`, `password`, `slider2` (`student` or `professor`) | `status`: `Prof` opens the professor home, anything else the student home | `index.html` |
| `signup.php` | POST | `ID`, `password`, `name` four times (confirmation, name, email, phone), `Type` (`Student` or `Prof`) | `status`: `True` returns to the login page | `signup.html` |
| `adduser.php` | POST | `class`, `description` | nothing; the page always says "Class added!" | `prohome.html` |
| `get_course.php` | GET | nothing | array of `ID`, `CourseName` | `set`, `set1`, `set2`, `grade` |
| `get_students_by_course.php` | GET | `courseId` | array of `ID`, `FirstName`, `LastName` | `grade.html` |
| `save_marks_setting.php` | POST | `courseId`, `MHomework`, `MLabs`, `MProject`, `MPresentation`, `MMidterm`, `MFinal` (0 to 500) | nothing | `set.html` |
| `save_percentage_setting.php` | POST | `courseId`, `PHomework`, `PLabs`, `PProject`, `PPresentation`, `PMidterm`, `PFinal` (0 to 100) | nothing; the page implies a non-200 reply means the total is not 100 | `set1.html` |
| `save_grade_setting.php` | POST | `courseId`, `ARangeStart`, `ARangeEnd`, then the same for `B`, `C`, `D`, `F` (0 to 100) | nothing | `set2.html` |
| `compute_and_save_grade.php` | POST | `CourseId`, `StudentId`, `MHomework` to `MFinal` (0 to 100) | `grade`, `percentage`, `totalMarks` | `grade.html` |
| `computegradestudent.php` | POST | `CourseId`, `StudentId`, `MHomework` to `MFinal` (0 to 100) | `grade`, `percentage` | `viewGrades.html` |
| `student.php` | GET | nothing | `Homework`, `Labs`, `Project`, `Presentation`, `Midterm`, `Final`, `Grade` | `grades.html` |

`viewGrades.html` always sends `CourseId=1` and `StudentId=1`.

## Third-party tools

The pages link to these tools and each opens in a new tab. The addresses are
`tools` in `js/config.js`, and a tool with an empty address is left out. With
`embedTools` set there, each opens in a sandboxed frame in a popup instead.

| Tool | Default address | Used for | Page |
| --- | --- | --- | --- |
| `greensheet` | `https://openloop.com/education/classes/sjsu_engr/engr_mobile_dev/fall2015/index.php` | course greensheet | `prohome.html` |
| `materials` | `https://varmapp.com/list_files.php` | course material list | `team.html` |
| `chat` | `https://www.hiippoo.com/chatroom1.php?team=hello` | chat room `team=hello` | `chat.html` |
| `video` | `https://www.gruveo.com/embed/` | video call widget | `videoCall.html` |
| `student` | `https://varmapp.com/` | the same page for every student | `student.html` |

The tools used to be framed inside the pages over plain HTTP. The HTTPS
addresses are assumptions: those sites have not been checked and some may no
longer exist.

jQuery and jQuery Mobile are served from `vendor/`, not from a CDN.
