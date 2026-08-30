# @dynamic-field-kit/angular

## 1.5.1

### Patch Changes

- Findable on npm: every package now carries real search keywords, and homepage points at the live demo instead of the README the npm page already renders.
- b22a6a1: Make the packages findable on npm, and point `homepage` at something worth
  landing on.

  The keyword lists were three entries long and two of those were the package's
  own name — nobody searches `dynamic-field-kit/core`. npm ranks search partly on
  keywords, so in practice these packages could only be found by someone who
  already knew what they were called. The repository has carried the right
  vocabulary as GitHub topics all along (`dynamic-forms`, `form-builder`,
  `form-engine`, `form-validation`, `schema-driven`, `headless`, and the three
  framework names); npm simply never saw any of it. Each package now carries that
  vocabulary plus the terms its own users would type, including the schema
  libraries it actually adapts — zod, yup, valibot and Standard Schema. Not JSON
  Schema, which it does not support.

  `homepage` pointed at the package's README on GitHub, which is the same text
  npm already renders on the package page from the shipped README. It now points
  at the live demo instead, where the forms actually run. The source stays one
  click away in `repository`.

## 1.5.0

### Minor Changes

- Form state hooks, schema adapters, wizard engine, DevTools and extended renderers across all four packages, with type declarations that now resolve correctly under node16 and nodenext.
- d91c737: Add form state hooks, schema adapters, wizard engine, DevTools and extended renderers.

  **Core**

  - `zodValidator`, `yupValidator`, `valibotValidator` / `standardSchemaValidator`. Adapters parse **synchronously** so their result is usable by the synchronous `validateFields`; schemas with async refinements or async `.test()` rules return a Promise and must be validated through `validateFieldsAsync`.
  - Adapters take an explicit `{ target: 'form' | 'field' }` option. `'form'` (the default) parses the form data object; `'field'` parses a single scalar value. The field-name shorthand — `zodValidator(schema, 'email')` — is unchanged.
  - Wizard engine: `createWizardState`, `validateStep`, `canGoNext`, `canGoPrev`, plus the navigation the engine needs to be usable - `goNext`, `goPrev`, `goToStep`, `markStepCompleted`, `isStepCompleted`. `goNext` records the step it leaves, so `completedSteps` is actually maintained.
  - Group array helpers: `moveGroupItem`, `swapGroupItems`, `insertGroupItem`, `focusFirstInvalidField`.
  - `switch` is a first-class field type: it had a shipped renderer in react and vue but no `FieldTypeMap` entry, so `type: 'switch'` did not typecheck.

  **React / Vue / Angular**

  - `useDynamicForm` (React, Vue) and `createDynamicFormStore` (Angular Signals) now expose the same surface, including `isSubmitting` and `isSubmitted`.
  - `handleSubmit(onValid, onInvalid)` returns a submit handler in every framework and calls `preventDefault` on the event it receives.
  - Default HTML5 renderers for `radio`, `range`, `file`, `date`, `time`, `datetime-local` and `switch`.
  - `DynamicFormDevTools` overlay for inspecting form data, errors, metadata and field descriptions, with an error-count badge in all three frameworks.
  - `MultiFieldInput` reports blur through `onBlurField` (an `@Output` in Angular), so a form store's `handleBlur` / `touched` / `validateOnBlur` can be wired to it. Vue and Angular previously had no blur plumbing at all.

### Patch Changes

- c3faa51: Document the v1.5 APIs in each package README: form state, schema adapters, the wizard engine, default renderers, DevTools and blur wiring. README ships in the npm tarball, so this reaches package pages only through a release.
- 75447a6: Close the remaining documentation gaps in each package README, so every public
  export is described somewhere. README ships in the npm tarball, so this reaches
  the package pages only through a release.

  - **Sync vs async validation** is now spelled out in core, with the consequence
    that was previously implicit: `validateField` / `validateFields` cannot await,
    so a `validate` hook returning a Promise is treated as valid on the sync path.
    `useDynamicForm` and `createDynamicFormStore` validate synchronously
    (including on submit), so async rules have to run through
    `validateFieldsAsync` explicitly. Each adapter README repeats the caveat and
    links to the core section.
  - Document `validateFieldAsync`, `validateFieldsAsync`, `resolveOptions` and
    `validators` in the react, vue and angular export lists, separated from each
    adapter's own exports so it is clear they are core re-exports.
  - Document the core types that appear in every signature but had no definition
    in the README: `Properties`, `ValidatorFn`, `FieldValidatorResult`,
    `FieldValidatorFunction`, and `FormStep` alongside `WizardState`.
  - Angular: document `layoutRegistry` / `LayoutRegistry`, the `ColumnLayout` /
    `RowLayout` / `GridLayout` components and `BaseInputComponent`, with a custom
    layout example. Its layout registry holds standalone components rather than
    render functions, which is the one place the three adapters genuinely differ,
    and it was the only adapter not documenting its registry at all.
  - Rename angular's `## What it exports` to `## Exports` to match react and vue.
  - Link the demo sub-routes: react's enterprise-features and wizard pages, and
    from core the per-framework demos plus the wizard it documents.

- e4f8dbd: Stop publishing the fesm2022 sourcemap, which is 70.7 KB of a 165.9 KB install.

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

- e4f8dbd: Correct the Angular peer range's lower bound from `>=13` to `>=14`.

  The published `fesm2022` bundle is Angular partial-compilation output, and each
  declaration in it carries the minimum Angular version able to link it. The
  highest across this package is `minVersion: "14.0.0"`, so an Angular 13
  application could never have consumed it — npm would install cleanly and the
  linker would then fail. The upper bound `<22` is unchanged.

  No runtime change: the bundle is byte-identical, and only the range in
  `package.json` moves.

- e10044b: Fix the type declarations consumers get under `moduleResolution: node16` /
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

- 244c3d4: Ship the MIT license text, and fix what the angular package tells npm.

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

- 5577177: Build with ng-packagr 19 instead of 17, which is what the package's Angular
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

## 1.4.0

### Minor Changes

- 132f74b: Framework adapters: validation support, scoped field registries via dependency
  injection, and unified cross-framework layout types.

  - Validation wired through `DynamicInput` / `FieldInput` / `MultiFieldInput`.
  - Scoped `FieldRegistry` injection (React context, Vue provide/inject, Angular
    `FIELD_REGISTRY` token) so consumers can supply their own registry.
  - Shared layout type definitions aligned across React, Vue, and Angular.

  Requires `@dynamic-field-kit/core@^1.3.0` (peer dependency) for the new
  validation and layout APIs.

  Note: `@dynamic-field-kit/core` is a peer dependency (not bundled). Consumers
  must install it alongside the adapter.
