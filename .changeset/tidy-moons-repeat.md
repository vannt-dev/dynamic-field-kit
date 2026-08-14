---
'@dynamic-field-kit/angular': patch
---

Build with ng-packagr 19 instead of 17, which is what the package's Angular
version has needed all along — ng-packagr 17 declared peers of
`@angular/compiler-cli ^17` and `typescript >=5.2 <5.5` against an installed
19.2.25 and 5.6.3, so installing needed `--legacy-peer-deps`.

The bundle consumers actually load is unchanged: `fesm2022` is byte-identical,
as are `index.d.ts` and `public-api.d.ts`. What changes is the rest of the
tarball. ng-packagr stopped emitting the per-file `esm2022/` output in 18,
because the fesm2022 bundle is what the Angular linker consumes, and its
`esm2022` and `esm` export conditions go with it. The `.` export keeps `types`
and `default`, matching what every Angular 19+ library ships.

|          | Before   | After           |
| -------- | -------- | --------------- |
| Unpacked | 317.1 KB | 165.9 KB (−48%) |
| Tarball  | 75.8 KB  | 33.7 KB (−56%)  |
| Files    | 33       | 19              |

If you were resolving this package through the `esm` or `esm2022` condition
explicitly, resolution now falls through to `default`, which points at the same
fesm2022 file those conditions already resolved to.
