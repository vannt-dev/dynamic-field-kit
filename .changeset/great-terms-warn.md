---
---

No release needed. TypeScript is a devDependency and the compiled output does
not move: `dist/index.*` and every `.d.ts` for all four packages is
byte-identical, as is angular's `fesm2022` bundle. The only file that changes is
angular's `fesm2022` sourcemap, whose mappings TypeScript 5.8 encodes slightly
differently.
