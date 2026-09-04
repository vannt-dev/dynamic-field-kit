# @dynamic-field-kit/vue

## 1.7.0

### Minor Changes

- Dirty-baseline rebasing, accessible validation errors, form-level message catalogs, and async field options across React, Vue, and Angular.
- 9b06e3f: Validation messages can be set once per form via `useDynamicForm({ messages })`,
  or process-wide via `setDefaultMessages`, instead of passing a string to every
  validator on every field. Built-in validators now resolve their message when
  they run rather than when the field description is built, which is what made a
  catalog impossible before. A message passed directly to a validator still wins,
  and the English defaults are unchanged when no catalog is supplied.

  `ValidationContext` - already `validate`'s fourth argument - gains an optional
  `t` resolver, so a hand-written validator can translate its own messages too.

  Adds `validators.matches(otherFieldName)` for confirm-password and
  confirm-email fields, which every consumer was hand-writing.

  No locale bundles ship: the mechanism is here, the translations are yours.

- a7358f9: Fix per-field `dirty`, which was measured against a baseline captured at mount
  and never re-based - wrong after `reset(newValues)` on all three adapters, and
  wrong on React and Vue for values that arrive after mount, where every field
  reported dirty forever.

  Adds `baselineValues` and `getDirtyValues()` to the form store on all three
  adapters, and an `initialProperties` prop to `MultiFieldInput` for re-basing
  without a store. Comparison moves from `!==` to `Object.is`, so a `NaN` numeric
  field no longer reads as permanently dirty.

  React's `useDynamicForm` no longer validates the same data twice per change.

- 53ed45a: `options` can now return a promise, covering both dependent selects
  (`optionsDeps`) and search-remote pickers (`onOptionsQuery`). Renderers receive
  `optionsStatus` and `optionsError` alongside `options`.

  `debounceMs` was declared on `FieldDescription`, published in the `.d.ts` and
  read by no implementation anywhere - setting it did nothing. It now debounces
  these loads.

  Debounce, abort of a superseded request, and discarding a response that lands
  out of order all live in core's `createOptionsLoader`, so the three adapters
  share one implementation. Synchronous and static options are untouched and never
  enter a loading state.

- e35e876: `ariaDescribedBy` is now `${id}-error` when a field has an error instead of
  being hard-coded `undefined`, and `makeErrorId` is exported so a custom renderer
  can put the matching id on its message element. Without this,
  `focusFirstInvalidField` had nothing to find for anyone following the official
  renderer recipe.

  Default renderers now render the validation message they were already being
  handed - the one visible change in this release. Custom renderers are untouched,
  so nobody gets two copies of their own message.

  Development builds now warn when `FieldDescription.props` carries a key the
  renderer prop contract owns, which 1.6.0 made possible to lose silently.

## 1.6.0

### Minor Changes

- Cancellable, status-aware async validation; touched state that reaches inside repeatable groups; Angular 21 and TypeScript 5.9 support; and peer ranges corrected to the versions that actually work, proven at both ends in CI.
- 67e4eec: Give every adapter one renderer-prop contract, unique field ids, and a touched
  state the form store can actually drive.

  Five things went wrong at once for anyone building a real form on 1.5.1, and
  four of them share a cause: `FieldRendererProps` was a type nobody enforced.
  Each adapter hand-wrote the object it handed the registered renderer, and the
  three lists drifted. React dropped `placeholder`, `min`, `max`, `step`,
  `accept` and `multiple`. Vue dropped `required`, `id`, `dirty` and the aria
  flags. Angular dropped `touched`, `dirty` and `id` — so an Angular renderer had
  no way to know whether a field had been touched, and "only show the error once
  the user leaves the field" had to be rebuilt by hand. Setting
  `placeholder` on a `FieldDescription` therefore did nothing at all on React and
  Vue: no error, no warning, the value simply vanished. Core now owns the list as
  `FIELD_RENDERER_PROP_KEYS` and builds the bag once in
  `buildFieldRendererProps`, which all three adapters call, and
  `scripts/check-renderer-prop-parity.js` fails the build if an adapter stops
  forwarding one. The single deliberate deviation is Vue's `class` in place of
  `className`: forwarding `className` lets it fall through to a renderer's root
  element, where Vue assigns `el.className` and wipes the class the renderer set
  on itself.

  Field ids were `dfk-field-${name}`, derived from the field name alone. Two
  forms holding a field of the same name — a create form beside an edit form, the
  most ordinary layout there is — emitted the same DOM id twice, which is invalid
  HTML and leaves every `label[for]` pointing at two inputs. Ids are now
  namespaced per `MultiFieldInput` instance (React `useId`, so it is SSR-safe;
  Vue's instance uid; a counter on Angular). Set `idPrefix` to pin them —
  `idPrefix="dfk-field"` reproduces the old ids exactly — or give a single field
  its own id with the new `FieldDescription.id`.

  Touched state had two independent trackers that never met: the one in
  `useDynamicForm`, and a private one inside `MultiFieldInput` that only blur
  could set and that was the one renderers actually saw. So
  `setFieldTouched` in an `onInvalid` handler changed nothing visible, submitting
  a form nobody had focused showed no errors at all (the button looked broken),
  and `reset()` could not clear the touched state a previous submit had left
  behind. `MultiFieldInput` now accepts `touched` as a controlled prop —
  `useDynamicForm` becomes the single source of truth for it, exactly as
  `properties`/`onChange` already were for data — plus `onTouchedChange`, and a
  `form` shorthand (React and Vue) that wires data, change, blur and touched in
  one prop. `handleSubmit` marks every field touched before validating, and the
  new `touchAll()`/`resetTouched()` sit alongside it. Omit `touched` and the old
  internal tracker still runs, so nothing breaks; for that mode a ref
  (`resetTouched()` on React and Vue, a public method on Angular) can clear it
  without remounting the component.

  The only behaviour change to watch for is the generated ids. Anything pinned to
  a literal `dfk-field-*` id in CSS or a test needs either `idPrefix="dfk-field"`
  or a per-field `id`. Angular's `MultiFieldInput` also loses four undocumented
  template helpers — `getResolvedOptions`, `getDisabled`, `getReadOnly` and
  `getError` — which its own template no longer calls now that `FieldInput`
  resolves all of it through core. Keeping a second copy of that logic beside the
  shared one is how the adapters drifted apart to begin with; the equivalents are
  `resolveOptions`, `resolveDisabled`, `resolveReadOnly` and `validateField`,
  already re-exported from this package.

  Form validity now reflects current data immediately instead of merely checking
  the lazily populated `errors` map. The error map remains lazy for display, and
  passing a form binding (or the new controlled `errors` input) makes that same
  map the renderer's source of truth, removing the previous timing mismatch.

  Promise-based validators are no longer silently accepted on submit.
  `validateFields` reports unresolved field names in `pending`; every framework
  form helper uses one async-capable validation pass before dispatching submit
  callbacks. React, Vue and Angular also expose
  `validateAsync()` for explicit pre-submit checks. Live `isValid` remains a
  synchronous answer because a property/computed/signal cannot await.

  The new UI-kit recipes show complete touched/error wiring for Ant Design,
  Vuetify and Angular Material.

- 5e0b08f: Make async validation answerable: a status you can act on, runs that cancel
  cleanly, and touched state that reaches inside repeatable groups.

  `ValidationResult` gains `complete` and `status` (`'valid' | 'invalid' |
'pending'`). Combining `valid` with `pending` was the only way to tell "nothing
  is wrong" from "nothing is wrong _yet_", and everyone got it wrong the same
  way — a `valid: true` with async rules still in flight reads as a green light.
  `status` is the single answer; `complete` says whether every applicable
  validator finished. Both are always present on a result the library returns, so
  reading them needs no fallback; code that constructs a `ValidationResult` by
  hand (a mock, a wrapper typed to return one) has to supply them.

  `FieldDescription.validationMode: 'async'` declares a validator that returns a
  Promise without the `async` keyword, which detection cannot see. Declaring it
  keeps the synchronous pass from invoking the validator at all — and, unlike
  detection, it is an explicit opt-in, so the dev warning about a field the live
  pass cannot check stays quiet for it.

  `validateFieldsAsync` now takes a `ValidationContext` and forwards its
  `AbortSignal` to every validator, runs independent validators in parallel
  instead of awaiting them one after another, skips validators once the signal is
  aborted, and reports an aborted run as `complete: false` / `status: 'pending'`.
  A validator that honours the signal the conventional way — rejecting with an
  `AbortError` — no longer rejects the caller's `handleSubmit`; an error that is
  not an abort still propagates.

  Each adapter's form helper exposes `isValidating`, `isValidationComplete` and
  `validationStatus`, and applies latest-run-wins: typing cancels an in-flight
  live validation so a stale result cannot overwrite a newer one. A submit is not
  collateral damage of that — it validates the snapshot the user submitted under
  a controller of its own, so editing a field mid-flight no longer leaves the
  form with the submit silently dropped, no `onValid`/`onInvalid`, and a button
  that just re-enables.

  `touchAll()` now expands to the concrete leaf paths that exist in the data
  (`contacts[0].email`, not `contacts`) via the new `collectFieldPaths`, skipping
  fields validation itself skips — hidden by `appearCondition`, or disabled.
  Repeatable group items receive `touched` and report blur with their full path,
  so a UI kit that only shows an error once a field is touched now works inside a
  group. An item with no touched keys still receives a map rather than
  `undefined`, which previously flipped the nested input into tracking touched by
  itself and left it stale after the owner cleared the map. The new
  `indexGroupPathMap` is what indexes those maps by item, exported so a custom
  renderer can do the same without filtering the whole map per item.

  React's `isValid` is now seeded from the initial data instead of from an
  effect. An effect never runs on the server, so a server-rendered form shipped
  `isValid: true` for an empty required field and never corrected it — a submit
  button rendered enabled and stayed that way.

  `@dynamic-field-kit/angular`'s `types` entry pointed at `dist/index.d.ts`,
  which is not where its type declarations are emitted any more; it and the
  `exports` block now point at the file that actually ships, so TypeScript
  consumers resolve the package's types again.

- eec9386: Correct the peer ranges to the ones that actually work, and prove both ends of
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
