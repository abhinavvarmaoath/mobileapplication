# Easy Grader

Mobile web front end for a course grading app. Professors set marks, weights
and grade ranges per course and grade students. Students estimate and view
their grades. It was written in 2016 with jQuery Mobile and is being
modernised step by step; progress and open questions are in
`MODERNISATION_NOTES.md`.

The PHP backend is not in this repo. The pages call it at the addresses in
`js/config.js`, `https://rubypals.com` by default; see
`docs/api-contract.md`. The tests stub it, so nothing here needs the network.

## Requirements

Node 22.22 or newer. Node 24 is the version in `.nvmrc`.

## Run

```sh
npm ci
npm run dev
```

This serves the pages at <http://127.0.0.1:5173/>. `index.html` is the login
page and needs the backend, or demo mode (see Demo). Pages can also be opened
directly, for example `set.html`.

## Test

```sh
npx playwright install chromium   # once, on a fresh machine
npm run test:unit                 # Vitest, for the TypeScript in app/
npm run test:e2e                  # Playwright against a stubbed backend
npm test                          # both
npm run check                     # lint, types, HTML, vendor, policy and secret
                                  # checks, then the tests
```

If Playwright's browser cannot be downloaded, point `CHROMIUM_EXECUTABLE_PATH`
at a Chromium binary.

Accessibility and HTML problems are counted per page and may only go down.
After fixing a page, record the new numbers and commit them with the fix:

```sh
UPDATE_BASELINES=1 npx playwright test accessibility
npm run lint:html -- --update
```

## Configuration

`js/config.js` holds the backend addresses and the links to third-party tools.
Every page carries a content security policy built from it, so after editing
that file run:

```sh
npm run csp
```

`npm run check` fails when a page is out of date. The policy allows scripts,
styles and images only from the app's own origin, requests only to that origin
and the configured backend, and no frames. A meta tag cannot carry
`frame-ancestors`, `sandbox` or `report-uri`; set those as response headers
where the app is hosted.

The third-party tools open in a new tab. Set `embedTools` in `js/config.js` to
open them in a sandboxed frame in the page instead; the policy then allows
frames from those addresses and no others.

## Demo

Without a backend the app can still run: set `demo: true` in `js/config.js`
and `js/demo.js` answers every call in the browser, with two courses, a few
students, and added classes and saved settings that last for the browser
session. Nothing is sent anywhere. To write a copy of the app in demo mode:

```sh
node tools/build-demo.mjs <empty directory>
```

`.github/workflows/pages.yml` publishes that copy to GitHub Pages. It stays
skipped until the repository variable `DEMO_PAGES` is `true` and Pages is set
to deploy from GitHub Actions.

## Layout

- `*.html` in the root are the pages.
- `css/app.css` holds the app's own styles; `themes/` is the jQuery Mobile
  theme; `vendor/` holds jQuery and jQuery Mobile (see its README).
- `tests/e2e` holds the specs, `tests/support` the stubbed backend and
  `tests/baselines` the recorded counts.
- `tools/` holds the static server, the HTML and vendor checks, the policy
  generator and the demo build.
