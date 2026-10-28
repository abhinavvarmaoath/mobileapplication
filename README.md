# Easy Grader

Mobile web front end for a course grading app. Professors set marks, weights
and grade ranges per course and grade students. Students estimate and view
their grades. It was written in 2016 with jQuery Mobile and is being
modernised step by step; progress and open questions are in
`MODERNISATION_NOTES.md`.

The PHP backend is not in this repo. The pages call it at
`http://rubypals.com`; see `docs/api-contract.md`. The tests stub it, so
nothing here needs the network.

## Requirements

Node 22.22 or newer. Node 24 is the version in `.nvmrc`.

## Run

```sh
npm ci
npm run dev
```

This serves the pages at <http://127.0.0.1:5173/>. `index.html` is the login
page and needs the backend. Pages can also be opened directly, for example
`set.html`.

## Test

```sh
npx playwright install chromium   # once, on a fresh machine
npm test                          # Playwright against a stubbed backend
npm run check                     # lint, types, HTML and secret checks, tests
```

If Playwright's browser cannot be downloaded, point `CHROMIUM_EXECUTABLE_PATH`
at a Chromium binary.

Accessibility and HTML problems are counted per page and may only go down.
After fixing a page, record the new numbers and commit them with the fix:

```sh
UPDATE_BASELINES=1 npx playwright test accessibility
npm run lint:html -- --update
```

## Layout

- `*.html` in the root are the pages.
- `themes/` is the jQuery Mobile theme.
- `tests/e2e` holds the specs, `tests/support` the stubbed backend,
  `tests/fixtures` the CDN stand-ins and `tests/baselines` the recorded counts.
- `tools/` holds the static server and the HTML check.
