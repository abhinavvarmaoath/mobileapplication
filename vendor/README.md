# Vendored libraries

The pages load these files from here instead of a CDN, so they make no
third-party requests and a content security policy can limit scripts to this
origin.

| Files | Library | Where it came from |
| --- | --- | --- |
| `jquery-1.8.2.min.js` | jQuery 1.8.2 | The copy this repo has always shipped, as `scripts/jquery.min.js`. The npm package has no built file, so it could not be compared with an official one. |
| `jquery.mobile-1.4.1.min.js`, `jquery.mobile.structure-1.4.1.min.css` | jQuery Mobile 1.4.1 | `dist/jquery.mobile.min.js` and `dist/jquery.mobile.structure.min.css` from the npm package `jquery-mobile@1.4.1`, byte for byte. |

The pages used to ask the CDN for jQuery Mobile 1.4.0. That release is not on
npm and the tests already ran against 1.4.1, so 1.4.1 is what ships.

Both libraries are old and unmaintained, and `npm audit` cannot see files
that are copied in. They stay until the front end is rebuilt (S3 in
`MODERNISATION_NOTES.md`).

`SHA256SUMS` records the checksums and `npm run check:vendor` fails when a file
no longer matches. Both libraries are MIT licensed; the licence texts are in
this directory.
