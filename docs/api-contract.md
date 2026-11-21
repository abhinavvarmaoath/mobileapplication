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

## Embedded third-party pages

| Host | Used for | Page |
| --- | --- | --- |
| `openloop.com` | course greensheet | `prohome.html` |
| `varmapp.com` | course material list, student popups | `team.html`, `student.html` |
| `www.hiippoo.com` | chat room `team=hello` | `chat.html` |
| `www.gruveo.com` | video call widget | `videoCall.html` |

jQuery and jQuery Mobile are served from `vendor/`, not from a CDN.
