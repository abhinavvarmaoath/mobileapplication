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
4. Hardening: S1, S5, S6, T7. The roadmap listed T7 and the optional embedding
   as needing approval; "go ahead with phase 4" was taken to cover them. The
   Pages deploy is the one part left switched off, because turning it on is a
   repository setting.

Held until the open questions are answered: B1, B4, B11, the LICENSE choice.

## Status

| Phase | State |
| --- | --- |
| 1 Safety net | done |
| 2 Clean-up | done |
| 3 Bug fixes | done, except the held items |
| 4 Hardening | done: S1, S5, S6, T7 (the Pages deploy is switched off) |
| 5 New front end | in progress, see the plan below |

Commands are in `README.md`. In a sandbox without Playwright's own browser,
set `CHROMIUM_EXECUTABLE_PATH` to a Chromium binary before `npm test`.

Where the work differs from the plan:

- Vite is deferred. Nothing is bundled yet, so `tools/serve.mjs` serves the
  pages exactly as a static host would. Add Vite with the new front end.
- Vitest is deferred until there is logic to unit-test.
- Workflow actions use major tags (`checkout@v6`, `setup-node@v6`,
  `upload-artifact@v4`, and in `pages.yml` `configure-pages@v6`,
  `upload-pages-artifact@v5`, `deploy-pages@v5`). The Pages versions came from
  a web search of cached results, so confirm them on the official releases
  pages. Pin the tags to commit SHAs once the SHAs can be checked against the
  official repositories; Dependabot keeps the tags current.
- Secret scanning uses secretlint instead of gitleaks so it runs locally and
  in CI without a third-party action.
- jQuery and jQuery Mobile are served from `vendor/`, not a CDN. jQuery Mobile
  is 1.4.1, where the pages asked for 1.4.0 (and the setup pages also for
  1.4.5): 1.4.0 is not on npm and 1.4.1 is what the tests have always run.

What Phase 4 changed that a visitor can see:

- Google Fonts is gone, so every page uses the theme's font stack.
- The header title is dark on every page, as it already was on four.
- Chat, video, materials, the greensheet and the student buttons open in a new
  tab instead of a popup frame. The six student buttons all go to
  `https://varmapp.com/`; the first used to go to `/index.html`.
- Setting `demo` in `js/config.js` runs the whole app without a backend.

Assumptions nobody has checked: that the backend and the tool sites answer on
HTTPS (the backend is never contacted from here), and that those sites still
exist.

Tool versions at the time of writing: Node 24 (22.22 minimum), Biome 2.6,
TypeScript 7.0, Playwright 1.64, axe-core 4.14, html-validate 11.17,
secretlint 13.1.

## Phase 5 plan: the new front end

Scope from the roadmap: U1 and U2, then screen by screen with M3 to M5 and U3
to U9, and finally S3 and A2. Exit: zero advisories on shipped libraries, no
serious axe findings, budgets met (50 KB gzipped per page). "Go ahead with
phase 5" was taken as the approval to replace jQuery Mobile and to delete each
old page once its replacement matches it.

Decisions

- No UI framework (the default for question 4). Vite and TypeScript with the
  DOM, plus a few small helpers. Vitest for logic, Playwright as before.
- Multi-page app with the same page names as today. Each screen is a small
  HTML shell and a TypeScript module.
- New code is in `app/` (the Vite root) and builds to `dist/`. The old pages
  stay at the repo root and are copied into `dist/` until replaced, so the
  existing specs run against the real build the whole way.
- `js/config.js` stays a separate classic script, so the addresses can change
  after a build. The CSP for new pages is added by a Vite plugin from the same
  config; old pages keep their committed meta tag until they go.
- The API client takes a transport. Production uses `fetch`. Demo mode uses an
  in-browser backend that is loaded only when `demo` is on.
- Specs find things by role, label and text, and wait for `html[data-ready]`
  and `aria-busy`, not for jQuery Mobile's classes.

Per screen

1. Make that screen's specs describe behaviour, not jQuery Mobile markup, and
   see them pass on the old page.
2. Build the new screen, swap it in under the same file name, and delete the
   old page and its script in the same commit.
3. The screen's specs pass and its HTML and axe baselines go down or go away.

Order: login, signup, the student screens, then the professor screens (home,
students, the three setup pages, grading). `viewTeams.html` is an orphan that
posts nowhere and is dropped at the end.

U4 (setup as one screen) and U5 (the what-if calculator) come after parity,
because each needs a backend answer: a read endpoint for saved values, and the
weights.

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

- S1 HTTPS end to end. The backend addresses are in `js/config.js` and
  default to HTTPS; whether the server answers on HTTPS is unknown. The
  libraries are served from `vendor/`.
- S2 Server strings are built into HTML (XSS). Done; no page uses
  `innerHTML`.
- S3 Retire jQuery 1.8.2 and jQuery Mobile with the UI replacement.
- S4 Server-side authentication and access control. Blocked on the backend.
- S5 Third-party iframes (chat, video, materials). Done. The tools open as
  links in a new tab, with their addresses in `js/config.js`. With
  `embedTools` they open in a sandboxed frame in a popup (`sandbox`,
  `referrerpolicy`, camera and microphone for the video tool only). The frame
  is created when the popup opens and removed when it closes, and the policy
  allows frames from the tool origins only while `embedTools` is on. The tool
  sites themselves are unchecked and some may be gone.
- S6 Content-Security-Policy. Done, as a meta tag built by `tools/csp.mjs` from
  `js/config.js`. The page scripts moved to `js/` and the inline styles into
  `css/app.css` first. jQuery Mobile's popup widget writes two style attributes
  (`display: none;` and an empty one), which the policy allows by hash. The
  headers a meta tag cannot carry (`frame-ancestors`, `sandbox`, `report-uri`)
  are up to whoever hosts the app.
- S7 Form hygiene (`autocomplete`, input types, logging). Done. jQuery
  Mobile forces `autocomplete="off"`, so `index.html` and `signup.html` carry
  a small script that restores the markup's values. Remove it with jQuery
  Mobile.
- S8 Supply-chain guardrails. Done except SHA pinning of actions.
- T7 Demo mode. Done: `js/demo.js` answers the contract in the browser when
  `demo` is true in `js/config.js`, and `tools/build-demo.mjs` writes a demo
  copy. `.github/workflows/pages.yml` publishes it but is skipped until the
  repository variable `DEMO_PAGES` is `true` and Pages is set to deploy from
  GitHub Actions; switching that on is the owner's call. The demo's rules (the
  percentages must total 100, grades from the saved weights and ranges) are
  read from the page code, not from the real server.
- S9 Licence and privacy clean-up. Template and names removed; LICENSE is
  waiting on question 6.

Not done, and worth doing soon

- Double-submit protection on the save buttons.
- `<html lang>` is missing on every page.
- The orange nav buttons still fail contrast (see `tests/baselines/axe.json`),
  and the Logout button on the two home pages is clipped to 30 by 10 pixels.
- Pin the workflow actions to commit SHAs.
- jQuery 1.8.2 and jQuery Mobile 1.4.1 are old and unmaintained, and
  `npm audit` cannot see them. The policy limits what an injected script could
  do; retiring them is S3.
- The policy needs `'unsafe-hashes'` for jQuery Mobile's popup styles
  (Chrome 69, Firefox 105, Safari 15.4). Older browsers lose only the popups.
- Only Chromium has run the specs.

Later phases, not approved yet

- One API module, table-driven forms, shared shell (M3-M5).
- Vite and TypeScript front end replacing jQuery Mobile screen by screen (A2).
- Design tokens, tab-bar shell, native forms, WCAG 2.2 AA (U1-U10).
- OpenAPI contract and an optional replacement backend (A3).
- PWA or Capacitor wrapper (A4).
- Syllabus import with evals (AI1).

## Resuming

```sh
git switch claude/nice-fermat-n9z0rq
npm ci
npm run check
```

`npm run check` runs lint, types, the HTML, vendor, policy and secret checks and
the Playwright suite (158 specs). After editing `js/config.js` run
`npm run csp`. After a fix that improves a page, record the new counts and
commit them with the fix (commands in `README.md`). Push after every commit: a
sandbox that is reclaimed loses anything that was not pushed.

## Open questions

1. Can sample live replies be captured (login success and failure per role,
   save errors), or is the backend gone?
2. Does the backend, and each third-party tool site, support HTTPS?
3. What does "max marks" mean in setup, and are marks graded out of it?
4. Framework for the new front end: none (default), or React, Vue, Svelte?
5. Approval needed for: replacing jQuery Mobile, any AI server component. The
   GitHub Pages demo is built but switched off; see T7.
6. Which LICENSE should the repo carry?
