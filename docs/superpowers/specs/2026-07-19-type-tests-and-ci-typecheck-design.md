# Type Tests + CI Typecheck Design

**Date:** 2026-07-19
**Branch:** `feat/type-tests-and-ci-typecheck` (based on `develop`)
**Backlog item:** #3 from `project_test_improvement_backlog` — "Make type tests real; wire a working typecheck into CI; fix the Windows `spawnSync('tsc')` bug."

## Problem

Two independent gaps let type regressions ship undetected:

1. **Type tests are not real.** `packages/core/test/types.test.ts` constructs typed objects and then asserts the value it just assigned (`const f: FieldDescription = { name: 'x', type: 'text' }; expect(f.name).toBe('x')`). vitest compiles with esbuild, which **strips types without checking them**, so these assertions pass regardless of whether the type is correct. There is not a single negative assertion — nothing verifies that an invalid shape is _rejected_. A regression that widened or broke a public type would not fail any test.

2. **There is no working repo-wide typecheck, and none in CI.** `npm run typecheck` shells out to `scripts/typecheck-all.js`, which calls `spawnSync('tsc', …)` with no shell. On Windows `tsc` resolves to `tsc.cmd`, which `spawnSync` cannot launch without a shell, so the script exits 1 without ever type-checking. It is also never invoked by CI. Separately, the per-package `tsc -p tsconfig.json` invocation omits `--noEmit`, and `packages/core/tsconfig.json` sets neither `noEmit` nor `outDir`, so running it **emits `.js`/`.d.ts` into the source tree**.

The only real typecheck of `src` today is a side effect of each package's production build (tsup / ng-packagr) during CI's build matrix.

## Goal

- Type tests that fail the suite when a public type regresses, including negative (`@ts-expect-error`) cases.
- A `npm run typecheck` that works cross-platform (Windows included), emits nothing into source trees, and runs in CI.
- Remove the bespoke, broken `typecheck-all.js`.

## Decisions (locked)

- **Type-test tool: vitest typecheck** (`expectTypeOf` / `assertType` / `@ts-expect-error`), not `tsd`. No new dependency — `packages/core` already ships vitest `0.34.6`, which supports typecheck mode and auto-detects `*.test-d.ts`. Consistent with the rest of the repo.
- **Repo typecheck: npm workspaces**, not a bespoke script. Each type-checkable package gets its own `typecheck` script; the root fans out with `--workspaces --if-present`. `scripts/typecheck-all.js` is deleted, which removes the Windows `spawnSync` bug by construction rather than patching it.

## Design

### Part A — Real type tests (core only)

Scope is `packages/core`; the type tests exercise core's exported public types, which every adapter depends on.

**New file `packages/core/test/types.test-d.ts`** using `expectTypeOf` / `assertType` from vitest, plus `@ts-expect-error` for negative cases. Coverage:

- `Properties` — is `Record<string, unknown>`; accepts empty and mixed-value objects.
- `FieldRendererProps<T>` — value narrows to `T`; all documented optional props are assignable; `onValueChange` signature.
- `FieldDescription` — minimal (`name` + `type`) accepted; optional fields accepted; `validate` / `disabledCondition` / `readOnlyCondition` signatures.
- `FieldTypeKey`, `FieldTypeMap` — augmentation via `declare module '../src'` still resolves.

**Negative assertions the current suite lacks entirely** (these are the point of the change):

- `FieldDescription` missing `type` → error.
- `FieldDescription.name` given a non-string → error.
- `FieldRendererProps<number>` assigned a string `value` → error.
- `validate` returning a non-`string | undefined` → error.

These run under `vitest --typecheck`, which reports a missing expected error (unused `@ts-expect-error`) or a failed `expectTypeOf` as a test failure. vitest 0.34's default typecheck include glob is `**/*.{test,spec}-d.ts`, so the file is picked up without extra config.

**Script.** `packages/core/package.json` gains `"test:types"` running vitest in typecheck mode over the test dir. The exact flag form (`vitest --run --typecheck` vs the `typecheck` subcommand, and whether a `typecheck` block is needed in `vitest.config.js`) is verified against the installed 0.34.6 during implementation; the config-based `test.typecheck.enabled` form is the fallback if the CLI flag alone does not pick up the file.

**Existing `types.test.ts`.** Keep only the assertions that exercise real _runtime_ behavior — the `appearCondition` / `validate` / `disabledCondition` / `readOnlyCondition` callbacks actually being invoked, and `Properties` special-character keys. Remove the "construct a typed object, assert the value just assigned" cases; their type intent moves to `types.test-d.ts` as real assertions. No real coverage is lost — the deleted lines asserted nothing about `src`.

### Part B — Repo-wide typecheck via workspaces

- `packages/core/package.json`: `typecheck` → `tsc -p tsconfig.json --noEmit` (add `--noEmit`; core's tsconfig has no `noEmit`/`outDir`, so without it tsc pollutes `src`).
- `packages/react/package.json`, `packages/vue/package.json`: add `typecheck` → `tsc -p tsconfig.json --noEmit`.
- `packages/angular`: **no** `typecheck` script. ng-packagr already type-checks Angular `src` at build time, and raw `tsc` cannot compile Angular decorators/templates without the Angular compiler. `--if-present` skips it.
- Root `package.json`: `typecheck` → `npm run typecheck --workspaces --if-present`.
- **Delete** `scripts/typecheck-all.js`. Confirm no other file references it (only the root script pointed at it today; CI does not).

**Risk:** `react` / `vue` have never been type-checked in isolation, so latent errors may surface on first run. That is the tool doing its job; fix the errors, or if any is non-trivial, stop and report rather than loosening a type. `tsc -p` on react/vue will also compile their test files (whatever `include` covers) — if vitest/jsdom ambient types are needed, add them to the package `tsconfig` `types`/`include` as the minimal fix.

### Part C — CI wiring

`.github/workflows/ci.yml`:

- Build `@dynamic-field-kit/core` first — react/vue resolve `@dynamic-field-kit/core` types through the workspace symlink to core's built `dist`, so typecheck needs `dist/*.d.ts` present.
- Run `npm run typecheck`.
- Run core's type tests: `npm run test:types --workspace=@dynamic-field-kit/core`.

Placement (fold into the existing lint/format job vs a dedicated `typecheck` job) is decided during implementation against the current workflow structure; either way it is a required check, not `continue-on-error`.

## Verification (evidence the tests are real)

1. `npm run typecheck` exits 0 on Windows and leaves **no** new `.js`/`.d.ts` files in any `src` tree (`git status` clean after).
2. Temporarily break a `test-d.ts` assertion (e.g. delete an expected error) → `npm run test:types` **fails**; revert.
3. Temporarily introduce a type error in `packages/react/src` → `npm run typecheck` **fails**; revert.
4. `core` coverage floor (75/75/60/75) still met after trimming `types.test.ts`.
5. Full existing gates still green: `npm run lint`, `npm run format-check`, all four builds, core/react/vue/angular suites, and the three verify scripts.

## Out of scope

- Coverage thresholds / `fail_ci_if_error` (backlog item 5).
- Type tests for react/vue/angular adapters — item 3 targets core's public types; adapter type tests can be a later item.
- Any change to the `FieldDescription` / `FieldRendererProps` types themselves; this work only observes them.
