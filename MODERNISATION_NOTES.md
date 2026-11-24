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
| 5 New front end | done, except U4 and U5 (see the end of the Phase 5 section) |

Commands are in `README.md`. In a sandbox without Playwright's own browser,
set `CHROMIUM_EXECUTABLE_PATH` to a Chromium binary before `npm test`.

Where the work differs from the plan:

- Vitest runs the unit tests in `app/src`; it came with the typed API client.
- Workflow actions use major tags (`checkout@v6`, `setup-node@v6`,
  `upload-artifact@v4`, and in `pages.yml` `configure-pages@v6`,
  `upload-pages-artifact@v5`, `deploy-pages@v5`). The Pages versions came from
  a web search of cached results, so confirm them on the official releases
  pages. Pin the tags to commit SHAs once the SHAs can be checked against the
  official repositories; Dependabot keeps the tags current.
- Secret scanning uses secretlint instead of gitleaks so it runs locally and
  in CI without a third-party action.
- No library ships any more. jQuery and jQuery Mobile were served from
  `vendor/` in Phases 4 and 5 and are deleted; `npm audit` covers every
  dependency, all of them for development.

What Phase 4 changed that a visitor can see:

- Google Fonts is gone, so every page uses the theme's font stack.
- The header title is dark on every page, as it already was on four.
- Chat, video, materials, the greensheet and the student buttons open in a new
  tab instead of a popup frame. The six student buttons all go to
  `https://varmapp.com/`; the first used to go to `/index.html`.
- Setting `demo` in the config runs the whole app without a backend.

Assumptions nobody has checked: that the backend and the tool sites answer on
HTTPS (the backend is never contacted from here), and that those sites still
exist.

Tool versions at the time of writing: Node 24 (22.22 minimum), Biome 2.6,
TypeScript 7.0, Playwright 1.64, axe-core 4.14, html-validate 11.17,
secretlint 13.1.

## Phase 5: the new front end

Scope from the roadmap: U1 and U2, then screen by screen with M3 to M5 and U3
to U9, and finally S3 and A2. Exit: zero advisories on shipped libraries, no
serious axe findings, budgets met (50 KB gzipped per page). "Go ahead with
phase 5" was taken as the approval to replace jQuery Mobile and to delete each
old page once its replacement matched it.

How it was built

- No UI framework (the default for question 4): Vite and TypeScript with the
  DOM and a few small helpers. Multi-page app with the same page names as
  before; each screen is a small HTML shell in `app/` and a module in
  `app/src/pages`. Vitest runs the unit tests, Playwright the end-to-end specs
  against a real `vite build`.
- `app/src/api` is the typed client (M3): one method per endpoint, one error
  type, a timeout, and a check of each answer's shape. It takes a transport, so
  demo mode (`app/src/demo`) can stand in for `fetch`, and is loaded only then.
- Screens are tables of fields given to one form renderer (M4) with rules in
  `app/src/forms`, an error summary, a message under each field, a busy state
  and a success message. The six grading categories are one list. One shell
  (M5, U2) draws the header, a 44 px logout and a tab bar that sits at the
  bottom on a phone and on top on a wide screen. Design tokens with light and
  dark themes are in `app/src/styles` (U1).
- The address config stays a separate script, `app/public/js/config.js`, so it
  can change after a build. A Vite plugin writes the content security policy
  into every page from it. The policy no longer needs any inline style.
- Specs find things by role, label and text and wait for `html[data-ready]` and
  `aria-busy`. Mutation checks were run on each screen's specs.

Result

- Every screen is rebuilt: login, signup, student home, group, chat, video
  call, grade estimate, grades, professor home, student list, the three setup
  pages and grading. The old pages, jQuery, jQuery Mobile, the theme and the
  vendor checks are deleted, and so is the orphan `viewTeams.html`, which
  posted nowhere.
- No axe finding at WCAG 2.2 AA plus best practice on any page, in light and
  dark and in six interactive states; no HTML problem; the heaviest page is
  about 10 KB gzipped, where the old professor pages were about 264 KB. Each is
  a check that fails the build (`npm run check`), with no baselines left.
- New behaviour, flagged in the commits: fields are required and checked
  before anything is sent; sliders that started at 60 are number inputs; the
  signup password confirmation is compared in the browser; alert boxes became
  messages on the page; loading, error and retry states exist; the weights must
  total 100 and grade ranges must not overlap or run backwards. B1, B10 and B11
  are unchanged, and no request changed.
- CI caught one real problem the local run did not: in an embedded tool's
  dialog, focus could land inside the frame, so Escape did not close it. The
  Close button now comes first and has the initial focus.

Not done

- U4 (course setup as one screen with steps) and U5 (per-category weights and
  the what-if calculator). Each needs a backend answer first: a read endpoint
  for saved values, and the weights.
- A manual screen-reader and keyboard pass. Axe finds only part of what a
  person would.
- U7 is partly done: the layout adapts between a phone and a wide screen, and
  forms go two to a row where that helps, but there is no container-query or
  landscape work.
- Only Chromium has run the specs.

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
  password confirmation. Held: needs the server's field names. The new
  signup screen compares the two passwords in the browser; the field names are
  unchanged.
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

- S1 HTTPS end to end. The backend addresses are in the config and default to
  HTTPS; whether the server answers on HTTPS is unknown. Nothing else is
  loaded from anywhere but the site itself.
- S2 Server strings are built into HTML (XSS). Done; no page uses
  `innerHTML`.
- S3 Retire jQuery 1.8.2 and jQuery Mobile. Done in Phase 5; no library ships.
- S4 Server-side authentication and access control. Blocked on the backend.
- S5 Third-party iframes (chat, video, materials). Done. The tools open as
  links in a new tab, with their addresses in the config. With `embedTools`
  they open in a native dialog with a sandboxed frame (`sandbox`,
  `referrerpolicy`, camera and microphone for the video tool only), created
  when it opens and removed when it closes. The policy allows frames from the
  tool origins only while `embedTools` is on. The tool sites themselves are
  unchecked and some may be gone.
- S6 Content-Security-Policy. Done, as a meta tag that `tools/csp.mjs` builds
  from the config and a Vite plugin writes into every page. Scripts, styles and
  images may come only from the site itself, requests go only to it and the
  backend, and nothing may be framed unless `embedTools` allows those
  addresses. The headers a meta tag cannot carry (`frame-ancestors`, `sandbox`,
  `report-uri`) are up to whoever hosts the app.
- S7 Form hygiene (`autocomplete`, input types, logging). Done. The form
  renderer sets `autocomplete` explicitly on each field.
- S8 Supply-chain guardrails. Done except SHA pinning of actions.
- T7 Demo mode. Done: `app/src/demo` answers the contract in the browser when
  `demo` is true in the config, and `tools/build-demo.mjs` writes a demo copy
  of a build. `.github/workflows/pages.yml` publishes it but is skipped until the
  repository variable `DEMO_PAGES` is `true` and Pages is set to deploy from
  GitHub Actions; switching that on is the owner's call. The demo's rules (the
  percentages must total 100, grades from the saved weights and ranges) are
  read from the page code, not from the real server.
- T5 Dev setup. Done: `npm run dev` serves the config with demo mode on, so the
  app answers itself, and `npm run dev:live` serves it as written, so the pages
  call the configured backend. A Vite plugin does it (`tools/dev-demo.mjs`,
  serve only, tested in `tools/dev-demo.test.ts`); builds are untouched. The
  quiet logger the build uses had also hidden the dev server's address, so it
  now applies to builds only. `.devcontainer` has the container: Node 24, the
  dependencies and Playwright's Chromium on creation, port 5173 forwarded. No
  Docker was available, so the container has not been started; its file was
  checked against the published devcontainer schema and its image tag against
  the registry. `dev:live` needs the backend to allow the dev server's origin
  (CORS); nobody has checked that.
- S9 Licence and privacy clean-up. Template and names removed; LICENSE is
  waiting on question 6.

Not done, and worth doing soon

- U4 and U5, and the manual accessibility pass, listed under Phase 5.
- Pin the workflow actions to commit SHAs.
- T6: pre-commit hooks (lefthook or husky), optional.
- M6: a dev-only logger. The app has one `console.error`, so this is low value.
- Check the pages on a real phone, and in Firefox and Safari.
- Tool and backend HTTPS addresses are assumptions nobody has checked.

Later phases, not approved yet

- OpenAPI contract and an optional replacement backend (A3).
- PWA or Capacitor wrapper (A4).
- Syllabus import with evals (AI1).

## Resuming

```sh
git switch claude/nice-fermat-n9z0rq
npm ci
npm run check
```

`npm run check` runs lint, types, the HTML and secret checks, the size check
(which builds), the unit tests and the Playwright suite. After editing the
config in a built site run `npm run csp`. Push after every commit: a sandbox
that is reclaimed loses anything that was not pushed.

## Open questions

1. Can sample live replies be captured (login success and failure per role,
   save errors), or is the backend gone?
2. Does the backend, and each third-party tool site, support HTTPS?
3. What does "max marks" mean in setup, and are marks graded out of it?
4. Framework: none was used (the default). Say if you would rather have React,
   Vue or Svelte; the screens are small enough to move.
5. Approval needed for any AI server component. Replacing jQuery Mobile is
   done. The GitHub Pages demo is built but switched off; see T7.
6. Which LICENSE should the repo carry?
