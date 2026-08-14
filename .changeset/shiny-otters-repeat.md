---
'@dynamic-field-kit/core': patch
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
---

Stop publishing sourcemaps, roughly halving what each package installs.

tsup was emitting sourcemaps with `sourcesContent`, so every `.map` carried a
full copy of the TypeScript source. That is what made them work at all — `files`
only publishes `dist`, so a map referencing `../src/*.ts` would otherwise
resolve to nothing — but it also made them about half of each tarball, shipped
to every consumer on every install.

| Package | Unpacked                | Tarball               | Files |
| ------- | ----------------------- | --------------------- | ----- |
| core    | 157.0 → 83.0 KB (−47%)  | 33.3 → 17.5 KB (−47%) | 8 → 6 |
| react   | 207.6 → 90.1 KB (−57%)  | 46.8 → 19.2 KB (−59%) | 8 → 6 |
| vue     | 250.4 → 109.4 KB (−56%) | 47.6 → 20.5 KB (−57%) | 8 → 6 |

Nothing that ends up in an application bundle changes — sourcemaps never do.
What changes is install size, and the ability to step into the library's
TypeScript source while debugging a consuming app.

This is a deliberate trade, not a free win: the maps worked. Each package's
`tsup.config.ts` carries the reasoning next to a `sourcemap: false` that is one
word away from restoring them.

`@dynamic-field-kit/angular` is unaffected; ng-packagr's published output does
not carry them.
