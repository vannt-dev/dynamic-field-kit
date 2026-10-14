---
'@dynamic-field-kit/angular': minor
---

Angular 22 is accepted: `@angular/core` and `@angular/common` are now `>=16 <23`. An app on Angular 22 could not install the package before, as npm refused the peer range. `scripts/verify-angular-peer-range.js` now checks Angular 16 and 22, and the demo app was built with the Angular 22 CLI and used in a browser.
