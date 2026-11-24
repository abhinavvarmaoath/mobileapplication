# Easy Grader

Mobile web front end for a course grading app. Professors set marks, weights
and grade ranges per course and grade students. Students estimate and view
their grades. It was written in 2016 with jQuery Mobile and has been rebuilt in
TypeScript with Vite and no framework; the history and open questions are in
`MODERNISATION_NOTES.md`.

The PHP backend is not in this repo. The pages call it at the addresses in
`app/public/js/config.js`, `https://rubypals.com` by default; see
`docs/api-contract.md`. The tests stub it, so nothing here needs the network.

## Requirements

Node 22.22 or newer. Node 24 is the version in `.nvmrc`.

## Run

```sh
npm ci
npm run dev        # the app answers itself, no backend needed
npm run dev:live   # the pages call the backend named in the config
```

Both start Vite and print its address, <http://localhost:5173/> unless that
port is taken. `npm run dev` serves the config with demo mode on (see Demo), so
every screen works and nothing is sent anywhere. `npm run dev:live` serves the
config as written. The browser then calls the backend from the dev server's
origin, so the backend has to allow it; nobody has checked that it does. The
dev server adds no content security policy, builds do.

`npm run build` writes the site to `dist/`, and `node tools/serve.mjs` serves
it the way a static host would. `.devcontainer` sets up the same thing in a dev
container: Node 24, the dependencies and Playwright's Chromium, with port 5173
forwarded.

## Test

```sh
npx playwright install chromium   # once, on a fresh machine
npm run test:unit                 # Vitest, for the TypeScript in app/
npm run test:e2e                  # Playwright against a build, with a stubbed backend
npm test                          # both
npm run check                     # lint, types, HTML, secret and size checks, then the tests
```

If Playwright's browser cannot be downloaded, point `CHROMIUM_EXECUTABLE_PATH`
at a Chromium binary.

A page may have no axe finding (WCAG 2.2 AA and best practice, in light and
dark, and in its main states), no HTML problem, and may load at most 50 KB,
gzipped. Each is a check that fails the build.

The keyboard specs (`tests/e2e/keyboard.spec.ts`) tab through every page and
the main journeys without a mouse. Every control is reached in order, shows a
focus ring that can be seen, and is never hidden behind the tab bar, and focus
is kept after a submit or a retry.

## Configuration

`app/public/js/config.js` holds the backend addresses and the links to
third-party tools. It is a separate script, so it can be edited in a built site
too. Every page carries a content security policy built from it. The build
writes the policy into the pages; after editing the config in `dist/`, run:

```sh
npm run csp
```

The policy allows scripts, styles and images only from the app's own origin,
requests only to that origin and the configured backend, and no frames. A meta
tag cannot carry `frame-ancestors`, `sandbox` or `report-uri`; set those as
response headers where the app is hosted.

The third-party tools open in a new tab. Set `embedTools` in the config to open
them in a sandboxed frame in the page instead; the policy then allows frames
from those addresses and no others.

## Demo

Without a backend the app can still run: set `demo: true` in the config and an
in-browser stand-in (`app/src/demo`) answers every call, with two courses, a few
students, and added classes and saved settings that last for the browser
session. Nothing is sent anywhere. To write a copy of a build in demo mode:

```sh
npm run build
node tools/build-demo.mjs <empty directory>
```

`.github/workflows/pages.yml` publishes that copy to GitHub Pages. It stays
skipped until the repository variable `DEMO_PAGES` is `true` and Pages is set
to deploy from GitHub Actions.

## Layout

- `app/*.html` are the page shells, one per screen, with the same names the
  pages have always had. `app/src` holds the code: `api` is the typed client
  for the backend, `forms` the field rules, `lib` the shell, form renderer and
  other shared pieces, `pages` one module per screen, `demo` the stand-in
  backend, `styles` the design tokens and components.
- `tests/e2e` holds the Playwright specs and `tests/support` the stubbed
  backend. Unit tests sit beside the code in `app/src`.
- `tools/` holds the static server, the HTML, size and policy tools, the demo
  build and the plugin that gives the dev server its demo mode.
