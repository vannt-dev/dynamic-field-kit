---
'@dynamic-field-kit/angular': patch
'@dynamic-field-kit/core': patch
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
---

Fix the type declarations consumers get under `moduleResolution: node16` /
`nodenext`, and fill in the npm metadata the package pages never had.

Every package declared a single `types` target for both module formats while
shipping two sets of declarations. `arethetypeswrong` on the built tarballs
reported core and react "masquerading as CJS" and vue "masquerading as ESM":
an ESM import resolved to the CommonJS declaration file, and vice versa. The
`exports` maps now declare `types` per condition, so each format resolves to
the declarations that describe it.

Angular was worse than a mismatch - it did not resolve at all. Its entry is an
`.mjs` bundle, so TypeScript reads its declarations in ESM mode, where the
extensionless `export * from './public-api'` that ng-packagr generates is error
TS2834. The failure is in `dist/index.d.ts`, the first file a consumer reaches,
so the package was unusable on node16 resolution. A `postbuild` step now adds
the explicit `.js` extension to relative specifiers in the emitted `.d.ts`
files, resolving each against the build output so a directory import becomes
`./layout/index.js` rather than a broken `./layout.js`. Angular also gains an
`exports` map and `"type": "module"`, which it needs to describe itself
honestly. All four packages are clean on all four resolution modes now, except
angular's `require()`, which is ESM-only by nature - as `@angular/core` is.

Also in the tarballs: `CHANGELOG.md` now ships, so the npm page has release
history, and angular no longer ships a second copy of its README and LICENSE
that ng-packagr had copied into `dist`. Every package gains `homepage`, `bugs`
and `repository.directory`, so npm links to the right README and issue tracker
instead of nothing, and `publishConfig.provenance`, so each published tarball
is signed and linked back to the workflow run that built it.
