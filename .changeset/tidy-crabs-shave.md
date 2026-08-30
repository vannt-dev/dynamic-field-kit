---
'@dynamic-field-kit/angular': patch
'@dynamic-field-kit/core': patch
'@dynamic-field-kit/react': patch
'@dynamic-field-kit/vue': patch
---

Ship the MIT license text, and fix what the angular package tells npm.

Every package declared `"license": "MIT"` with no LICENSE file anywhere in the
repo, so the tarballs carried the claim and not the terms. npm includes a
LICENSE at the package root regardless of `files`, so all four now ship one.

The angular package's README was wrong in three places, all of them visible on
its npm page: the "pin versions explicitly" example named `core@^1.0.12` and
`angular@^1.2.3`, nine public exports (`FieldInputProps`, `DynamicFormOptions`,
`FieldTypeKey`, `LayoutConfig`, `ColumnLayoutConfig`, `RowLayoutConfig`,
`GridLayoutConfig`, `BaseLayoutConfig`, `ResponsiveLayoutConfig`) appeared
nowhere in it, and a section titled "Angular 14 and earlier" named versions the
package cannot run on — its peer floor is `>=14`.

Its `sideEffects: false` was also untrue: `defaultLayouts.ts` registers the
three layout components with a module-scope call, which is exactly the side
effect react and vue list their own layout modules for. The flag is now
`["**/fesm2022/*.mjs"]` — a glob because ng-packagr copies the field into
`dist/package.json`, where paths resolve one directory lower, and a bundler
reads whichever manifest is nearest the module. Nothing observable changes
today: bundling the published 1.4.0 with esbuild while importing only
`DynamicInput` already kept all three `register()` calls, because the fesm2022
bundle is a single module the app is using. The flag was a claim waiting to
break.
