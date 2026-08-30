# @dynamic-field-kit/vue

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
- 75447a6: Stop `MultiFieldInput` from pinning the whole package into every consumer
  bundle.

  `MultiFieldInput` renders itself recursively for repeatable groups, and reached
  itself through a module-scope `multiFieldInputSelfRef = MultiFieldInput`
  assignment. A bare top-level assignment is a side effect no bundler is allowed
  to drop, so it anchored `MultiFieldInput` → `FieldInput` → `DynamicInput` →
  `getDefaultRenderer` → every default renderer, even in an app that imported none
  of them.

  The self-reference is now a hoisted function declaration returning
  `MultiFieldInput`. Its body is not evaluated until a group actually renders, so
  nothing is retained until something uses it. The explicit return type keeps
  TypeScript from having to infer `MultiFieldInput` from inside its own
  initializer, which is what the forward-declared `let` was working around.

  Measured with esbuild, minified, `vue` external:

  | App imports            | Before   | After            |
  | ---------------------- | -------- | ---------------- |
  | one core helper        | 13,934 B | 2,479 B (−82%)   |
  | `DynamicInput` only    | 13,934 B | 9,196 B (−34%)   |
  | `MultiFieldInput` only | 13,944 B | 13,958 B (+14 B) |
  | everything             | 20,530 B | 20,543 B (+13 B) |

  Apps that pull in the whole surface pay 13–14 bytes for the wrapper function,
  which is the honest cost of the change.

  No behaviour or type change: `dist/index.d.ts` is byte-identical, and the vue
  suite (115 tests, including the repeatable-group recursion) passes unchanged.

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

- 75447a6: Let consumer bundlers drop the parts of the adapters an app does not use.

  Components were declared as bare top-level calls — `defineComponent({...})` in
  vue, `React.memo(...)` in react. A bundler cannot prove such a call is
  side-effect free, so it has to evaluate it even when the result is unused, which
  kept every default renderer and every component in an app's bundle no matter how
  little of the package it imported. Marking those calls `/* @__PURE__ */` makes
  them droppable. Measured with esbuild, minified, framework external:

  | App imports                | Before   | After           |
  | -------------------------- | -------- | --------------- |
  | react: one core helper     | 11,149 B | 3,258 B (−71%)  |
  | react: `DynamicInput` only | 11,150 B | 6,830 B (−39%)  |
  | react: everything          | 17,601 B | unchanged       |
  | vue: one core helper       | 17,379 B | 13,934 B (−20%) |
  | vue: `DynamicInput` only   | 17,379 B | 13,934 B (−20%) |
  | vue: everything            | 20,530 B | unchanged       |

  Apps that use the whole surface are unchanged, which is the expected result —
  there is nothing to drop. The shipped `dist` grows slightly (react +0.03 KB, vue
  +0.29 KB) because the annotations are comments in the bundle; the trade is a
  bigger published file for a smaller consumer bundle.

  `@dynamic-field-kit/core` now declares `"sideEffects": false`. It has no
  top-level execution at all — the only module-scope work is `new FieldRegistry()`
  assigned to an export — so the claim is accurate, and it lets bundlers that rely
  on the flag rather than their own analysis skip core entirely when it is unused.
  The adapters deliberately do not set it: their entry side-effect-imports the
  default layouts in order to register them.

- 75447a6: Stop publishing sourcemaps, roughly halving what each package installs.

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
