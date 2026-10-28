# CDN stand-ins

The pages load jQuery and jQuery Mobile from code.jquery.com. The tests never
use the network, so the Playwright harness serves these files instead.

| Requested | Served from |
| --- | --- |
| `jquery-1.8.2.min.js` | `jquery-1.8.2.min.js`, the copy the repo shipped as `scripts/jquery.min.js` |
| `jquery.mobile-1.4.0.min.js`, `jquery.mobile-1.4.5.min.js` | `jquery.mobile.min.js` |
| `jquery.mobile.structure-1.4.0.min.css` | `jquery.mobile.structure.min.css` |

The jQuery Mobile files are release 1.4.1 from the npm package
`jquery-mobile@1.4.1`, the closest release published there. 1.4.0 and 1.4.5
are not on npm, so behaviour that differs between those releases is not
covered. Both libraries are MIT licensed. They are test fixtures and are not
shipped.

Remove this directory when jQuery and jQuery Mobile are replaced.
