---
'@dynamic-field-kit/angular': minor
'@dynamic-field-kit/core': minor
'@dynamic-field-kit/react': minor
'@dynamic-field-kit/vue': minor
---

Correct the peer ranges to the ones that actually work, and prove both ends of
each in CI.

`@dynamic-field-kit/angular` declared `@angular/core` and `@angular/common` as
`>=14 <22`, but the form store is built on `signal` and `computed`, which
Angular introduced in **16**. On 14 or 15 npm accepted the install and the
package then failed on import - the manifest promised something it could not
do. The range is now `>=16 <22`, so the same install is refused up front.

`@dynamic-field-kit/vue` moves from `vue ^3.0.0` to `^3.2.0`.
`useDynamicForm` now aborts an in-flight validation when the owning effect
scope is disposed, using `getCurrentScope` / `onScopeDispose` - both Vue 3.2.
Without this an unmounted form held its request open until the response came
back. If you are on Vue 3.0 or 3.1, stay on 1.5.x; nothing else in the package
ever required 3.2, but nothing tested below it either.

Both ranges are now verified rather than asserted:
`scripts/verify-vue-peer-range.js` server-renders the packed tarballs under Vue
3.2 and the newest 3.x, and `scripts/verify-angular-peer-range.js` installs
them against Angular 16 and 21 and checks the package imports, its components
evaluate and it shares one registry with core. Both run in the CI verify job,
next to the React one that has existed since 1.5.0. A render is out of reach
for Angular - the published fesm2022 needs the CLI's linker to instantiate a
component - but import-and-wire is the level that breaks across majors, which
is exactly how a floor of 14 survived years of `signal()`.

The three adapters now re-export `collectFieldPaths`, `indexGroupPathMap` and
the `ValidationContext` type from core, so typing a validator's `context`
argument no longer means importing `@dynamic-field-kit/core` alongside the
adapter.

`@angular/platform-browser-dynamic`, which Angular 21 deprecates, is gone from
the package's devDependencies and from the demo app, which never used it - the
test setup now initialises through `@angular/platform-browser/testing`.
