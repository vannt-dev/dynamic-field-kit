# Type Tests + CI Typecheck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make core's type tests fail on real type regressions (vitest typecheck), and give the repo a working, CI-wired `npm run typecheck` while deleting the broken `scripts/typecheck-all.js`.

**Architecture:** Add a `packages/core/test/types.test-d.ts` exercised by vitest's typecheck mode (`vitest typecheck --run`), with positive `assertType`/`expectTypeOf` and negative `@ts-expect-error` cases. Replace the bespoke `typecheck-all.js` with per-package `typecheck` scripts (`tsc --noEmit`) fanned out by `npm run typecheck --workspaces --if-present`. Wire both into the CI `lint-and-build` job.

**Tech Stack:** vitest `0.34.6` typecheck mode (already installed in `packages/core`), TypeScript `tsc --noEmit`, npm workspaces, GitHub Actions.

Spec: `docs/superpowers/specs/2026-07-19-type-tests-and-ci-typecheck-design.md`

## Global Constraints

- Work on branch `feat/type-tests-and-ci-typecheck`, based on `develop`. It already exists and is checked out.
- Never append a `Co-Authored-By: Claude ...` trailer or any Claude attribution to commits, and no "Generated with Claude Code" footer in any PR body. End the commit message at the last content line.
- The vitest typecheck command on 0.34.6 is exactly `vitest typecheck --run` (the `--typecheck` CLI flag does NOT exist in 0.34.6; it throws `Unknown option --typecheck`). vitest auto-detects `test/**/*.test-d.ts` in typecheck mode; no `vitest.config` change is needed for detection.
- Every `tsc` typecheck MUST pass `--noEmit`. `packages/core/tsconfig.json` sets neither `noEmit` nor `outDir`, so without `--noEmit` tsc emits `.js`/`.d.ts` into `src`. After any typecheck run, `git status` must be clean.
- Angular gets NO `typecheck` script: ng-packagr already type-checks Angular `src` at build time, and raw `tsc` cannot compile Angular decorators/templates. `--if-present` skips it.
- `react`/`vue` typecheck resolves `@dynamic-field-kit/core` types from the workspace symlink to core's built `dist`. Build core (`npm run build --workspace=@dynamic-field-kit/core`) before running `npm run typecheck`.
- Do NOT change the `FieldDescription` / `FieldRendererProps` / `FieldTypeMap` types in `src`. This work only observes them.
- Prettier governs all files: run `npm run format-check` before every commit. Lint gate: `npm run lint`.
- Baseline confirmed before starting: `core`, `react`, `vue` all pass `tsc -p tsconfig.json --noEmit` today with no emit; there are no pre-existing latent type errors to fix.

---

### Task 1: Real type tests for core's public types

**Files:**

- Create: `packages/core/test/types.test-d.ts`
- Modify: `packages/core/package.json` (add `test:types` script)

**Interfaces:**

- Consumes: the exported types `Properties`, `FieldRendererProps`, `FieldDescription`, `FieldTypeKey`, `FieldTypeMap` from `packages/core/src`.
- Produces: `npm run test:types --workspace=@dynamic-field-kit/core` running `vitest typecheck --run`. Task 4 (CI) depends on this script name.

**Context:** vitest strips types with esbuild, so the current runtime `types.test.ts` never fails on a type regression and has zero negative assertions. This task adds compile-time-checked assertions. Type-test development is a TDD loop: write assertions, run `vitest typecheck --run`, and adjust each assertion to the _actual_ resolved type where the compiler disagrees — an assertion the compiler rejects for the wrong reason is a bug in the test, not the type. Never delete a negative case to make the run green; a failing `@ts-expect-error` means the directive is unused (the code compiled) — that is a real finding.

- [ ] **Step 1: Add the `test:types` script**

In `packages/core/package.json`, add this script alongside the existing `test` script:

```json
    "test:types": "vitest typecheck --run",
```

- [ ] **Step 2: Write the type tests**

Create `packages/core/test/types.test-d.ts`:

```ts
import { assertType, expectTypeOf, test } from 'vitest';
import type {
  FieldDescription,
  FieldRendererProps,
  FieldTypeMap,
  Properties,
} from '../src';

// Apps augment FieldTypeMap to register field types; the augmentation must
// still resolve. This mirrors how a consuming app extends the interface.
declare module '../src' {
  interface FieldTypeMap {
    customType: { id: string };
  }
}

test('Properties is a string-keyed record of unknown', () => {
  expectTypeOf<Properties>().toEqualTypeOf<Record<string, unknown>>();
  assertType<Properties>({ a: 1, b: 'x', c: true, d: { nested: true } });
  assertType<Properties>({});
});

test('FieldRendererProps narrows value to its type parameter', () => {
  expectTypeOf<FieldRendererProps<string>['value']>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<FieldRendererProps<number>['value']>().toEqualTypeOf<
    number | undefined
  >();

  assertType<FieldRendererProps<string>>({
    value: 'test',
    label: 'Label',
    placeholder: 'Enter value',
    required: true,
    disabled: false,
    readOnly: false,
    error: ['bad'],
    options: [{ label: 'Option 1' }],
    className: 'c',
    description: 'help',
    onValueChange: (v) => expectTypeOf(v).toEqualTypeOf<string>(),
  });

  assertType<FieldRendererProps>({});
});

test('FieldRendererProps rejects a value of the wrong type', () => {
  // @ts-expect-error - value must be a number for FieldRendererProps<number>
  assertType<FieldRendererProps<number>>({ value: 'not a number' });

  // @ts-expect-error - onValueChange must accept a number, not a string
  const cb: FieldRendererProps<number>['onValueChange'] = (v: string) => v;
  void cb;
});

test('FieldDescription accepts a minimal and a fully-populated shape', () => {
  assertType<FieldDescription>({ name: 'username', type: 'text' });

  assertType<FieldDescription>({
    name: 'email',
    type: 'text',
    label: 'Email',
    placeholder: 'Enter email',
    required: true,
    disabled: false,
    className: 'c',
    description: 'desc',
    options: [{ label: 'o' }],
    props: { maxLength: 5 },
    appearCondition: (data) => data.x === 1,
    validate: (value) => (typeof value === 'string' ? undefined : 'bad'),
    disabledCondition: (data) => data.locked === true,
    readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
    computeValue: (data) => data.a,
    fields: [{ name: 'child', type: 'text' }],
    defaultItem: {},
    keyField: 'id',
    minItems: 0,
    maxItems: 3,
    addLabel: 'Add',
    removeLabel: 'Remove',
  });
});

test('FieldDescription requires name and type of the right types', () => {
  // @ts-expect-error - missing required 'type'
  assertType<FieldDescription>({ name: 'x' });

  // @ts-expect-error - missing required 'name'
  assertType<FieldDescription>({ type: 'text' });

  // @ts-expect-error - name must be a string
  assertType<FieldDescription>({ name: 123, type: 'text' });
});

test('validate must return string | string[] | undefined', () => {
  // @ts-expect-error - validate may not return a number
  const bad: FieldDescription['validate'] = () => 42;
  void bad;

  const ok: FieldDescription['validate'] = () => ['e1', 'e2'];
  void ok;
});

test('condition hooks return booleans', () => {
  expectTypeOf<
    NonNullable<FieldDescription['appearCondition']>
  >().returns.toEqualTypeOf<boolean>();
  expectTypeOf<
    NonNullable<FieldDescription['disabledCondition']>
  >().returns.toEqualTypeOf<boolean>();
});

test('FieldTypeMap augmentation resolves', () => {
  expectTypeOf<FieldTypeMap['customType']>().toEqualTypeOf<{ id: string }>();
  assertType<FieldDescription>({ name: 'c', type: 'customType' });
});
```

- [ ] **Step 3: Run the type tests — expect PASS**

Run: `npm run test:types --workspace=@dynamic-field-kit/core`

Expected: all tests pass, summary shows `Type Errors  no errors`. If the compiler rejects a _positive_ assertion, the assertion's expected type is wrong — correct it to the real resolved type (e.g. adjust an `expectTypeOf(...).toEqualTypeOf<...>()` target). If a `@ts-expect-error` reports "Unused '@ts-expect-error' directive", the code it guards actually compiled — that means the type is looser than expected; keep the finding, and if it reveals the type genuinely accepts that input, convert the case to a positive `assertType` and note it in the commit message rather than deleting it.

- [ ] **Step 4: Prove the tests are real — expect FAIL**

Temporarily append a deliberately wrong assertion to the file:

```ts
test('TEMP sanity — must fail', () => {
  expectTypeOf<Properties>().toEqualTypeOf<string>();
});
```

Run: `npm run test:types --workspace=@dynamic-field-kit/core`
Expected: FAIL, `Type Errors  1 failed`, non-zero exit. This confirms the mechanism catches type errors (esbuild-stripped runtime tests never could).

Then delete the `TEMP sanity` test and re-run:

Run: `npm run test:types --workspace=@dynamic-field-kit/core`
Expected: PASS again.

- [ ] **Step 5: Confirm normal test run ignores the type-test file**

Run: `npm run test --workspace=@dynamic-field-kit/core`
Expected: the same test count as before this task (the runtime suite). `types.test-d.ts` is NOT collected — core's vitest `include` glob is `test/**/*.{test,spec}.{js,ts}`, which does not match `*.test-d.ts`.

- [ ] **Step 6: Format and commit**

```bash
npx prettier --write packages/core/test/types.test-d.ts packages/core/package.json
git add packages/core/test/types.test-d.ts packages/core/package.json
git commit -m "test(core): add real type tests via vitest typecheck

The runtime types.test.ts is esbuild-stripped, so it never fails on a type
regression and had zero negative assertions. types.test-d.ts adds compile-
time assertions - positive assertType/expectTypeOf plus @ts-expect-error
negatives for missing name/type, wrong scalar types, and a bad validate
return - run by 'vitest typecheck --run' via the new test:types script."
```

---

### Task 2: Trim the runtime `types.test.ts` to real runtime tests

**Files:**

- Modify: `packages/core/test/types.test.ts`

**Interfaces:**

- Consumes: nothing new. Removes the tautological "construct a typed object, assert the value just assigned" cases whose type intent now lives in `types.test-d.ts` (Task 1).

**Context:** The remaining tests must exercise _runtime_ behavior — app-supplied callbacks actually being invoked, and `Properties` key access — not type assignability. Keep those; drop the rest.

- [ ] **Step 1: Replace the file contents**

Overwrite `packages/core/test/types.test.ts` with exactly:

```ts
import { describe, expect, test } from 'vitest';
import type { FieldDescription, Properties } from '../src';

// Compile-time type guarantees live in types.test-d.ts. These tests only
// exercise runtime behavior: app-supplied callbacks being invoked, and
// Properties key access.

describe('FieldDescription runtime callbacks', () => {
  test('appearCondition is invoked with form data', () => {
    const condition = (d: Properties) => d.showAdvanced === true;
    const field: FieldDescription = {
      name: 'advanced',
      type: 'text',
      appearCondition: condition,
    };

    expect(field.appearCondition?.({ showAdvanced: true })).toBe(true);
    expect(field.appearCondition?.({ showAdvanced: false })).toBe(false);
  });

  test('complex appearCondition logic evaluates against nested data', () => {
    const condition = (d: Properties) =>
      d.role === 'admin' &&
      (d.age as number) >= 18 &&
      (d.tags as string[]).includes('vip');

    expect(condition({ role: 'admin', age: 25, tags: ['vip', 'active'] })).toBe(
      true
    );
    expect(condition({ role: 'user', age: 25, tags: ['vip'] })).toBe(false);
    expect(condition({ role: 'admin', age: 15, tags: ['vip'] })).toBe(false);
  });

  test('validate, disabledCondition and readOnlyCondition are invoked', () => {
    const field: FieldDescription = {
      name: 'email',
      type: 'text',
      validate: (value) =>
        typeof value === 'string' && value.includes('@')
          ? undefined
          : 'Invalid email',
      disabledCondition: (data) => data.locked === true,
      readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
    };

    expect(field.validate?.('a', {}, {})).toBe('Invalid email');
    expect(field.validate?.('a@b', {}, {})).toBeUndefined();
    expect(field.disabledCondition?.({ locked: true })).toBe(true);
    expect(field.readOnlyCondition?.({}, { frozen: true })).toBe(true);
  });
});

describe('Properties runtime access', () => {
  test('supports special-character and mixed-style keys', () => {
    const props: Properties = {
      'special-key': 'value',
      camelCase: 'test',
      snake_case: 'test',
    };

    expect(props['special-key']).toBe('value');
    expect(props['camelCase']).toBe('test');
    expect(props['snake_case']).toBe('test');
  });
});
```

- [ ] **Step 2: Run the core suite**

Run: `npm run test --workspace=@dynamic-field-kit/core`
Expected: PASS. The `Types` describe block is gone; these four runtime tests replace it. Total core count drops by the removed tautologies — that is expected and not a regression.

- [ ] **Step 3: Confirm core still type-checks (test files included)**

Run: `(cd packages/core && npx tsc -p tsconfig.json --noEmit)` then `git status --short`
Expected: exit 0, and `git status` shows no emitted files. core's tsconfig `include`s `test`, so this also compiles `types.test.ts` and `types.test-d.ts`.

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write packages/core/test/types.test.ts
git add packages/core/test/types.test.ts
git commit -m "test(core): reduce types.test.ts to real runtime assertions

The type-assignability cases moved to types.test-d.ts, where they are
actually checked. What remains here invokes app-supplied callbacks
(appearCondition/validate/disabledCondition/readOnlyCondition) and exercises
Properties key access - behavior esbuild does not strip."
```

---

### Task 3: Repo-wide typecheck via npm workspaces

**Files:**

- Modify: `packages/core/package.json` (add `--noEmit` to `typecheck`)
- Modify: `packages/react/package.json` (add `typecheck` script)
- Modify: `packages/vue/package.json` (add `typecheck` script)
- Modify: `package.json` (root `typecheck` script)
- Delete: `scripts/typecheck-all.js`

**Interfaces:**

- Produces: `npm run typecheck` at the repo root that type-checks core, react, and vue with `--noEmit`, skipping angular. Task 4 (CI) depends on this.

**Context:** `scripts/typecheck-all.js` calls `spawnSync('tsc', …)` with no shell, so on Windows it cannot launch `tsc.cmd` and exits 1 without checking. Replacing it with workspace scripts removes the bug by construction. Only the root `package.json` references the script today (CI does not).

- [ ] **Step 1: Add `--noEmit` to core's typecheck**

In `packages/core/package.json`, change the `typecheck` script from `tsc -p tsconfig.json` to:

```json
    "typecheck": "tsc -p tsconfig.json --noEmit",
```

- [ ] **Step 2: Add typecheck scripts to react and vue**

In `packages/react/package.json` AND `packages/vue/package.json`, add:

```json
    "typecheck": "tsc -p tsconfig.json --noEmit",
```

- [ ] **Step 3: Point the root script at the workspaces**

In the root `package.json`, change:

```json
    "typecheck": "node scripts/typecheck-all.js",
```

to:

```json
    "typecheck": "npm run typecheck --workspaces --if-present",
```

- [ ] **Step 4: Delete the broken script**

```bash
git rm scripts/typecheck-all.js
```

- [ ] **Step 5: Build core, then run the repo typecheck**

```bash
npm run build --workspace=@dynamic-field-kit/core
npm run typecheck
```

Expected: core, react, and vue each print `> tsc -p tsconfig.json --noEmit` and exit 0; angular is skipped (no script). Total exit 0.

- [ ] **Step 6: Confirm nothing was emitted**

Run: `git status --short`
Expected: only the four modified `package.json` files and the deleted `scripts/typecheck-all.js` — no `.js`/`.d.ts` under any `src` or `test` tree.

- [ ] **Step 7: Prove typecheck catches a src regression — expect FAIL**

Temporarily add a type error to `packages/react/src` — pick any exported `.ts` and add at the end:

```ts
const _typecheckProbe: number = 'not a number';
```

Run: `npm run typecheck`
Expected: FAIL with a TS2322 error in the react package, non-zero exit. Then remove the line and re-run:

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 8: Format and commit**

```bash
npx prettier --write package.json packages/core/package.json packages/react/package.json packages/vue/package.json
git add package.json packages/core/package.json packages/react/package.json packages/vue/package.json
git add -u scripts
git commit -m "build: replace broken typecheck-all.js with workspace typecheck

scripts/typecheck-all.js ran spawnSync('tsc') with no shell, so on Windows
it could not launch tsc.cmd and exited 1 without type-checking anything. Each
package now owns a 'tsc -p tsconfig.json --noEmit' typecheck script and the
root fans out with --workspaces --if-present (angular is skipped; ng-packagr
type-checks it at build time). --noEmit stops tsc emitting into src, since
core's tsconfig sets neither noEmit nor outDir."
```

---

### Task 4: Wire typecheck and type tests into CI

**Files:**

- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: root `npm run typecheck` (Task 3) and `npm run test:types --workspace=@dynamic-field-kit/core` (Task 1).

**Context:** The `lint-and-build` job already runs `npm ci` and builds all four packages, so core's `dist` (which react/vue typecheck resolves against) is present. Add the two checks there as required steps.

- [ ] **Step 1: Add the steps after "Build packages"**

In `.github/workflows/ci.yml`, in the `lint-and-build` job, immediately after the `Build packages` step (the one that builds core/react/vue/angular) and before `Show bundle sizes`, insert:

```yaml
- name: Typecheck
  run: npm run typecheck

- name: Type tests
  run: npm run test:types --workspace=@dynamic-field-kit/core
```

- [ ] **Step 2: Validate the workflow YAML**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!/name: Typecheck/.test(y)||!/npm run test:types/.test(y)) throw new Error('steps missing'); console.log('CI steps present')"`
Expected: `CI steps present`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run typecheck and core type tests in lint-and-build

The lint-and-build job already builds every package, so core's dist is
available for react/vue typecheck to resolve. Adds 'npm run typecheck' and
the core 'test:types' vitest typecheck run as required checks."
```

---

### Task 5: Full verification and backlog memory update

**Files:** none in the repo (verification + agent memory only).

- [ ] **Step 1: Run every CI gate locally, in order**

```bash
npm run build --workspace=@dynamic-field-kit/core
npm run typecheck
npm run test:types --workspace=@dynamic-field-kit/core
npm run lint
npm run format-check
npm run build --workspace=@dynamic-field-kit/react
npm run build --workspace=@dynamic-field-kit/vue
npm run build --workspace=@dynamic-field-kit/angular
```

Expected: every command exits 0. `format-check` prints "All matched files use Prettier code style!".

- [ ] **Step 2: Run all four package test suites**

```bash
npm run test --workspace=@dynamic-field-kit/core
(cd packages/react && npx vitest run)
(cd packages/vue && npx vitest run)
npm run test --workspace=@dynamic-field-kit/angular
```

Expected: all pass. core's count is lower than before (Task 2 trimmed tautologies); react/vue/angular unchanged.

- [ ] **Step 3: Run the three verify scripts from the repo root**

```bash
node scripts/verify-framework-deps.js
node scripts/check-cross-framework-imports.js
node scripts/integration-cross-registry.js
```

Expected: each prints its OK/passed message and exits 0.

- [ ] **Step 4: Confirm a clean tree**

Run: `git status --short`
Expected: empty. No stray emitted files anywhere.

- [ ] **Step 5: Update the backlog memory**

Edit `C:\Users\vance\.claude\projects\C--Git-dynamic-field-kit\memory\project_test_improvement_backlog.md`:

- Mark **item 3 DONE** (2026-07-19, branch `feat/type-tests-and-ci-typecheck`): real type tests via `vitest typecheck --run` in `packages/core/test/types.test-d.ts` (positive + `@ts-expect-error` negatives); `scripts/typecheck-all.js` deleted and replaced with per-package `tsc --noEmit` scripts fanned out by `npm run typecheck --workspaces --if-present`; both wired into the CI `lint-and-build` job. Note the Windows `spawnSync` bug is gone by construction, and `--noEmit` fixes the tsc-emits-into-src problem.
- Leave items 4, 5, 6, 7, 8 open.

Then edit `C:\Users\vance\.claude\projects\C--Git-dynamic-field-kit\memory\project_ci_gates_and_test_gotchas.md`:

- Add to the CI gates list: `npm run typecheck` (core/react/vue via `tsc --noEmit`; angular via its build) and core `npm run test:types` (`vitest typecheck --run`), both in the `lint-and-build` job.
- Add a gotcha: vitest `0.34.6` has no `--typecheck` CLI flag; the command is `vitest typecheck --run`, and type tests live in `*.test-d.ts` (not collected by the normal `vitest run`).

- [ ] **Step 6: Finish the branch**

Invoke the `superpowers:finishing-a-development-branch` skill to decide integration (PR into `develop` — see [[project_integration_branch_develop]]; the base is `develop`, not `master`).

---

## Notes for the implementer

- The vitest typecheck command is `vitest typecheck --run`. Do NOT use `vitest --typecheck` (throws `Unknown option --typecheck` on 0.34.6).
- Type-test TDD: write assertion → `npm run test:types` → adjust to the real type. A failing `@ts-expect-error` ("Unused directive") means the guarded code compiled — a real looseness finding, not something to silence by deleting the case.
- Always `--noEmit`. After any typecheck, `git status` must be clean; a stray `.d.ts`/`.js` under `src` means an emit slipped through.
- Angular is intentionally excluded from `npm run typecheck`; its build is its typecheck. Do not add a `typecheck` script to `packages/angular`.
- Build core before `npm run typecheck` so react/vue can resolve `@dynamic-field-kit/core` types from `dist`.
