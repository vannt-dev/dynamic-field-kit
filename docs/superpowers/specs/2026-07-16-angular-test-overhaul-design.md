# Angular Test Overhaul — Design

Date: 2026-07-16
Status: approved, ready for planning

## Problem

The Angular package reports 36 passing tests. Essentially none of them test the
package.

Verified on `develop` at `759ec9d`:

- **Zero** specs use `TestBed`; no component is ever mounted.
- Eight assertions are tautologies (`expect(true).toBe(true)`,
  `expect('row').toBe('row')`).
- Specs that appear to test behaviour re-implement the logic inline. For
  example, `angular.spec.ts` filters `appearCondition` by hand inside the test
  instead of calling the library, so it asserts against code written in the test
  file.
- `DynamicInput.spec.ts` never references `DynamicInput`.

This is not laziness in the specs — it is forced by the test infrastructure.

### Root cause

The karma setup cannot compile **any** import. A probe spec importing only
`@angular/core` fails identically to one importing `@dynamic-field-kit/core`:

```
Uncaught ReferenceError: exports is not defined
    at test/__probe.spec.js:8:23
```

`karma-typescript` emits CommonJS (`exports.x = ...`) and the bundler never
wraps it, so `exports` is undefined in the browser. The only specs that can pass
are ones that import nothing — which is exactly what the suite contains.

Separately, `karma.conf.js` lists only `test/**/*.spec.ts` in `files`, so
`test.ts` — the sole caller of `getTestBed().initTestEnvironment(...)` — is
never loaded. TestBed was never initialised.

This corrects an earlier diagnosis recorded during Part 3, which blamed the
CommonJS format of `@dynamic-field-kit/core` and dropped the Angular
`validation.spec.ts` on that basis. Core's format is not the problem; the
karma-typescript bundling is.

### Consequence

Angular's `DynamicInput` is the most intricate code in the repo (dynamic
`ViewContainerRef` rendering, manual prop sync, output subscription, fallback
HTML, recursive standalone imports) and has zero behavioural coverage. The
Part 2 and Part 3 Angular wiring is guarded only by build-time template
type-checking.

## Goals

- Real, mounted-component tests for all of `packages/angular/src`.
- One test toolchain across the repo.
- Angular stops being a special case in CI.

## Non-goals

- Changing Angular public API or renderer contract.
- Test work in core, react, or vue (tracked separately in the test backlog).
- E2E/example-app smoke tests.

## Approach

Replace karma/jasmine/karma-typescript with vitest + jsdom, matching the
versions react and vue already use (`vitest ^1.6.0`, `jsdom ^24`), and compile
Angular with `@analogjs/vite-plugin-angular@^1.16` (peer:
`@angular-devkit/build-angular@^19`).

### Alternatives considered

**SWC + `unplugin-swc`, converting constructor DI to `inject()`.** Lighter; no
`build-angular`. Rejected: it requires changing `src/` to suit the test runner,
and it is a lightly-documented path.

**`jest-preset-angular`.** Most proven for Angular, but puts jest beside vitest
in one repo, defeating the toolchain-unification goal.

Plain vitest with no Angular plugin was ruled out on evidence:
`BaseInput`, `FieldInput`, and `MultiFieldInput` use constructor DI
(`constructor(private cdr: ChangeDetectorRef)`), which needs
`design:paramtypes` metadata that esbuild does not emit. All four templates are
inline (no `templateUrl`), so nothing forces AOT.

## Architecture

| Item     | From                                  | To                                       |
| -------- | ------------------------------------- | ---------------------------------------- |
| Runner   | `karma start --single-run`            | `vitest run`                             |
| Env      | ChromeHeadless                        | jsdom                                    |
| Compile  | `karma-typescript`                    | `@analogjs/vite-plugin-angular`          |
| Config   | `karma.conf.js`, `tsconfig.spec.json` | `vitest.config.ts`                       |
| Setup    | `test.ts` (never loaded)              | `test/setup.ts`, loaded via `setupFiles` |
| Coverage | `karma-coverage` (reports `0/0`)      | `@vitest/coverage-v8`                    |

`test/setup.ts` imports `zone.js`, then `zone.js/testing`, then calls
`getTestBed().initTestEnvironment(BrowserDynamicTestingModule,
platformBrowserDynamicTesting())`. Load order matters and is the most likely
point of failure.

Tests construct `new FieldRegistry()` (scoped registry, added in Part 2) rather
than the private-state reset hack `(fieldRegistry as any).registry = {}`.

### Removed

- Specs: `angular.spec.ts`, `DynamicInput.spec.ts`, `FieldInput.spec.ts`,
  `integration.spec.ts`, `layouts.spec.ts`.
- Config: `karma.conf.js`, `tsconfig.spec.json`, `test.ts`.
- devDeps: `karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`,
  `karma-typescript`, `jasmine`, `@types/jasmine`.
- Script: `test:coverage`.

## Phases

Each phase must be green before the next begins.

**Phase 1 — infrastructure + spike.** Stand up the runner and mount one real
component. **Gate: if analog does not work here, stop and report before writing
further tests.** This phase also settles the `isComponentType` question below.

**Phase 2 — high-risk core.**

- `DynamicInput`: dynamic rendering via `ViewContainerRef`; prop sync across
  `KNOWN_PROPS`; `valueChange` / `onValueChange` output binding; `extraProps`
  forwarding; fallback HTML rendering; unknown-type error path; cleanup and
  unsubscribe on destroy.
- `MultiFieldInput`: multi-field rendering; `appearCondition`; repeatable
  groups; `computeValue`; and the Part 3 surface — `error`, effective
  `disabled` / `readOnly`, and `validityChange`.

**Phase 3 — remainder.** `FieldInput`, `BaseInput`, `layoutRegistry`,
`defaultLayouts`, `fieldRegistryToken`, `dynamic-field-kit.module`,
`public-api`.

## Suspected bug: `isComponentType`

`DynamicInput.ts:138-142`:

```ts
private isComponentType(renderer: unknown): boolean {
  return typeof renderer === 'object' && renderer !== null && 'cmp' in renderer;
}
```

The README instructs registering renderers as classes
(`fieldRegistry.register('text', TextFieldComponent as any)`). A class is
`typeof 'function'`, not `'object'`, and Angular's static is `ɵcmp`, not `cmp`.
So the predicate returns false for a real component; control reaches the
`typeof Renderer === 'function'` branch, calls `renderFallback`, invokes the
class without `new`, throws `TypeError`, and the `catch` renders the red
"Failed to render field" div.

If that holds, the adapter's primary use case never worked, and no test could
have caught it. This is a hypothesis, not a finding: karma is broken, so it has
not been executed. Phase 1's first mounted test decides it.

**Decision:** if confirmed, fix it in this cycle. The new tests would be red
from the start otherwise, and the test that exposes it serves as the red-green
evidence for the fix. The PR becomes "test overhaul + one bugfix".

## CI

In `.github/workflows/ci.yml`:

- Drop `needs-chrome: true` from the angular matrix entry and drop the
  `Install Chrome` (`browser-actions/setup-chrome`) step. jsdom needs no
  browser, so angular stops being a special case.
- Change `test-cmd` to
  `npm run test --workspace=@dynamic-field-kit/angular -- --coverage`, matching
  react and vue.
- `coverage/lcov.info` gains real numbers; today angular reports
  `Unknown% (0/0)` because karma-coverage had nothing to instrument.

No coverage threshold is introduced here (test backlog item 5).

## Verification

Every phase green before the next. Final gate matches Part 3: build all four
packages, `npm run lint`, `npm run format-check`, all four suites, and the three
verify scripts (`verify-framework-deps.js`, `check-cross-framework-imports.js`,
`integration-cross-registry.js`).

Angular's test count will drop well below 36. That is the point: 36 fake tests
are replaced by a smaller number of real ones. Count is not the success metric;
mounted-component coverage of `src/` is.

## Risks

- `@angular-devkit/build-angular` is a heavy install with tight peers (Angular
  19, TS ~5.6, vite 5 via vitest 1.6). Confined to devDependencies; nothing
  published changes.
- `zone.js` / `zone.js/testing` load order before `initTestEnvironment` is the
  usual breakage point for vitest + Angular.

Both surface in Phase 1, which is why the gate exists.

## Out of scope, noted

The vue `test` script is bare `vitest` (watch mode) and hangs when run
non-interactively; react already uses `vitest run`. It is a one-word fix but
belongs to test backlog item 4, not this cycle.
