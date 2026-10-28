# Modernisation notes

Running log for modernising this repo: a 2016 jQuery Mobile front end for a
course grading app ("Easy Grader"). Kept current so work can resume in a new
session.

## Ground rules

- Work happens on `claude/nice-fermat-n9z0rq`, never on `master`.
- One logical change per commit. The app and the tests pass at every commit.
- Characterisation tests come before refactors. Bug fixes, refactors and new
  features are separate commits.
- Ask before: deleting beyond what is listed here, changing data formats or
  schemas, upgrading a major framework version, adding a paid or external
  service.
- No secrets in the repo. None found so far.

## Decisions

- This is a course project with no live users. The aim is a portfolio-quality
  front end.
- Features and the backend API contract stay. The backend is not in this repo
  and is never contacted. Tests stub it.
- The target is a responsive web app. A native wrapper is optional, later.
- Visuals may change.
- The vendored ThemeForest template, the stale `Student/` copy, the saved 404
  pages and the bare-repo files are removed. History is not rewritten.
- Real-looking names become neutral demo data. The repo stays public.

## Scope approved so far

1. Safety net: npm project, Playwright tests against a stubbed backend,
   accessibility and HTML baselines, CI, Dependabot, secret scan, README, API
   contract.
2. Clean-up: relative links, one jQuery and one jQuery Mobile per page, native
   `select` and `details` in place of the template widgets, delete dead
   weight, neutral demo data.
3. Bug fixes: B2, B3, B5-B8, B12, B14, S2, S7.

Held until the open questions are answered: B1, B4, B11, the LICENSE choice.

## Status

| Phase | State |
| --- | --- |
| 1 Safety net | in progress |
| 2 Clean-up | not started |
| 3 Bug fixes | not started |

## Backlog

IDs come from the ideas report written before implementation started.

Bugs

- B1 Any login reply other than `Prof` opens the student home; no error shown.
  Held: needs sample login replies.
- B2 Save handlers say "saved" on error; some have no error handler.
- B3 Saves are sent with no course or student selected.
- B4 Signup sends four fields under the name `name` and does not check the
  password confirmation. Held: needs the server's field names.
- B5 Login Cancel is a submit button.
- B6 `student.html` has six popups with the same id.
- B7 The student list accumulates across courses and can show stale replies.
- B8 `grade.html` redefines `print()` and logs form values on every click.
- B9 Links point at a developer's local `file:///` path.
- B10 Student pages use fixed student and course ids. Blocked on the backend.
- B11 Setup allows marks up to 500 but grading stops at 100. Held: needs a
  product answer.
- B12 Grade ranges are not validated; a stray backslash is rendered.
- B13 Four pages load two jQuery and two jQuery Mobile copies.
- B14 Smaller navigation and markup slips.

Security

- S1 HTTPS end to end. Blocked on the backend.
- S2 Server strings are built into HTML (XSS).
- S3 Retire jQuery 1.8.2 and jQuery Mobile with the UI replacement.
- S4 Server-side authentication and access control. Blocked on the backend.
- S5 Third-party iframes (chat, video, materials).
- S6 Content-Security-Policy.
- S7 Form hygiene (`autocomplete`, input types, logging).
- S8 Supply-chain guardrails.
- S9 Licence and privacy clean-up.

Later phases, not approved yet

- One API module, table-driven forms, shared shell (M3-M5).
- Vite and TypeScript front end replacing jQuery Mobile screen by screen (A2).
- Design tokens, tab-bar shell, native forms, WCAG 2.2 AA (U1-U10).
- Demo deploy on GitHub Pages (T7).
- OpenAPI contract and an optional replacement backend (A3).
- PWA or Capacitor wrapper (A4).
- Syllabus import with evals (AI1).

## Open questions

1. Can sample live replies be captured (login success and failure per role,
   save errors), or is the backend gone?
2. Does the backend support HTTPS?
3. What does "max marks" mean in setup, and are marks graded out of it?
4. Framework for the new front end: none (default), or React, Vue, Svelte?
5. Approval needed for: replacing jQuery Mobile, the GitHub Pages demo, any AI
   server component.
6. Which LICENSE should the repo carry?
