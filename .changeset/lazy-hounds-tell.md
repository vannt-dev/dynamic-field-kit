---
'@dynamic-field-kit/angular': patch
---

Correct the Angular peer range's lower bound from `>=13` to `>=14`.

The published `fesm2022` bundle is Angular partial-compilation output, and each
declaration in it carries the minimum Angular version able to link it. The
highest across this package is `minVersion: "14.0.0"`, so an Angular 13
application could never have consumed it — npm would install cleanly and the
linker would then fail. The upper bound `<22` is unchanged.

No runtime change: the bundle is byte-identical, and only the range in
`package.json` moves.
