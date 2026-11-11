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
| 1 Safety net | done |
| 2 Clean-up | done |
| 3 Bug fixes | done, except the held items |

Commands are in `README.md`. In a sandbox without Playwright's own browser,
set `CHROMIUM_EXECUTABLE_PATH` to a Chromium binary before `npm test`.

Where the work differs from the plan:

- Vite is deferred. Nothing is bundled yet, so `tools/serve.mjs` serves the
  pages exactly as a static host would. Add Vite with the new front end.
- Vitest is deferred until there is logic to unit-test.
- Workflow actions use major tags (`checkout@v6`, `setup-node@v6`,
  `upload-artifact@v4`). Pin them to commit SHAs once the SHAs can be checked
  against the official repositories; Dependabot keeps the tags current.
- Secret scanning uses secretlint instead of gitleaks so it runs locally and
  in CI without a third-party action.
- The pages are tested against jQuery Mobile 1.4.1, the nearest release on
  npm, in place of 1.4.0 and 1.4.5. Check the pages in a real browser,
  especially the setup pages, which used to load both releases.

Tool versions at the time of writing: Node 24 (22.22 minimum), Biome 2.6,
TypeScript 7.0, Playwright 1.64, axe-core 4.14, html-validate 11.17,
secretlint 13.1.

## Backlog

IDs come from the ideas report written before implementation started.

Bugs

- B1 Any login reply other than `Prof` opens the student home; no error shown.
  Held: needs sample login replies.
- B2 Save handlers say "saved" on error; some have no error handler. Done.
  `grades.html` still shows its placeholders, not a message, when loading
  fails.
- B3 Saves are sent with no course or student selected. Done.
- B4 Signup sends four fields under the name `name` and does not check the
  password confirmation. Held: needs the server's field names.
- B5 Login Cancel is a submit button. Done.
- B6 `student.html` has six popups with the same id. Done.
- B7 The student list accumulates across courses and can show stale replies.
  Done.
- B8 `grade.html` redefines `print()` and logs form values on every click.
  Done, and no page logs to the console now; the test fixture enforces it.
- B9 Links point at a developer's local `file:///` path. Done.
- B10 Student pages use fixed student and course ids. Blocked on the backend.
- B11 Setup allows marks up to 500 but grading stops at 100. Held: needs a
  product answer.
- B12 Grade ranges are not validated; a stray backslash is rendered. Done.
  The default 0-100 ranges overlap, so they cannot be saved untouched.
- B13 Four pages load two jQuery and two jQuery Mobile copies. Done.
- B14 Smaller navigation and markup slips. Done for the listed ones. Left:
  `viewTeams.html` is still an orphan whose file input goes nowhere.

Security

- S1 HTTPS end to end. Blocked on the backend.
- S2 Server strings are built into HTML (XSS). Done; no page uses
  `innerHTML`.
- S3 Retire jQuery 1.8.2 and jQuery Mobile with the UI replacement.
- S4 Server-side authentication and access control. Blocked on the backend.
- S5 Third-party iframes (chat, video, materials).
- S6 Content-Security-Policy.
- S7 Form hygiene (`autocomplete`, input types, logging). Done. jQuery
  Mobile forces `autocomplete="off"`, so `index.html` and `signup.html` carry
  a small script that restores the markup's values. Remove it with jQuery
  Mobile.
- S8 Supply-chain guardrails. Done except SHA pinning of actions.
- S9 Licence and privacy clean-up. Template and names removed; LICENSE is
  waiting on question 6.

Not done, and worth doing soon

- Double-submit protection on the save buttons.
- `<html lang>` is missing on every page and the iframes have no `title`.
- The orange header and nav fail contrast (see `tests/baselines/axe.json`),
  and the Logout button on the two home pages is clipped to 30 by 10 pixels.
- Pin the workflow actions to commit SHAs.
- Check the setup pages in a real browser: they used to load jQuery Mobile
  1.4.0 and 1.4.5 together and now load 1.4.0 only.

Later phases, not approved yet

- One API module, table-driven forms, shared shell (M3-M5).
- Vite and TypeScript front end replacing jQuery Mobile screen by screen (A2).
- Design tokens, tab-bar shell, native forms, WCAG 2.2 AA (U1-U10).
- Demo deploy on GitHub Pages (T7).
- OpenAPI contract and an optional replacement backend (A3).
- PWA or Capacitor wrapper (A4).
- Syllabus import with evals (AI1).

## Resuming

```sh
git switch claude/nice-fermat-n9z0rq
npm ci
npm run check
```

`npm run check` runs lint, types, the HTML and secret checks and the
Playwright suite (123 specs). After a fix that improves a page, record the
new counts and commit them with the fix (commands in `README.md`). Push after
every commit: a sandbox that is reclaimed loses anything that was not pushed.

## Open questions

1. Can sample live replies be captured (login success and failure per role,
   save errors), or is the backend gone?
2. Does the backend support HTTPS?
3. What does "max marks" mean in setup, and are marks graded out of it?
4. Framework for the new front end: none (default), or React, Vue, Svelte?
5. Approval needed for: replacing jQuery Mobile, the GitHub Pages demo, any AI
   server component.
6. Which LICENSE should the repo carry?
