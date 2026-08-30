---
'@dynamic-field-kit/angular': patch
---

Stop publishing the fesm2022 sourcemap, which is 70.7 KB of a 165.9 KB install.

When core, react and vue dropped their sourcemaps, angular was recorded as
unaffected on the grounds that "ng-packagr's published output does not carry
them". That was wrong. ng-packagr emits
`fesm2022/dynamic-field-kit-angular.mjs.map` with `sourcesContent` — 12 embedded
TypeScript files — and `files: ["dist"]` has been publishing it ever since.

|          | Before   | After          |
| -------- | -------- | -------------- |
| Unpacked | 165.9 KB | 97.1 KB (−41%) |
| Tarball  | 33.7 KB  | 18.2 KB (−46%) |
| Files    | 19       | 18             |

This is the same deliberate trade the other three packages made, not a free win:
the map worked, and dropping it costs the ability to step into this library's
TypeScript source while debugging a consuming app.

ng-packagr has no switch for it, so a `postbuild` step
(`scripts/strip-sourcemaps.js`) deletes the map and the
`//# sourceMappingURL=` comment that pointed at it. The comment has to go too —
excluding the map at publish time alone would leave every consumer's devtools
fetching a URL that 404s.

Nothing that reaches an application bundle changes: the fesm2022 bundle is
identical bar that one trailing comment line.
