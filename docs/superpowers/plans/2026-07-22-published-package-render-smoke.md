# Published-Package Render Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CI-blocking smoke suite that imports each adapter as a real consumer (bare specifier → built `dist`), mounts a component through the real framework runtime on jsdom, and asserts DOM output.

**Architecture:** A new private `smoke/` workspace. Its tests import `@dynamic-field-kit/{core,react,vue}` by bare specifier, which resolves through each package's `exports` map to `dist` (verified: all three point only to `dist`). React uses `@testing-library/react`; Vue uses `@vue/test-utils`; both on jsdom. A vitest `globalSetup` preflight fails with a readable message if a `dist` is missing. Runs in the CI `verify` job, which already builds all packages first.

**Tech Stack:** vitest 1.6, jsdom 24, `@vitejs/plugin-react` 4, `@testing-library/react` 16, `@vue/test-utils` 2.4, react/react-dom 19, vue 3.5. (Angular best-effort: `@angular/*` 19 + zone.js.)

## Global Constraints

- Integration branch is `develop`, NOT `master`. This work is on branch `feat/published-package-smoke` off `develop`.
- No Co-Authored-By trailer on commits; no "Generated with Claude Code" footer.
- Tests import the **bare package specifier** (`@dynamic-field-kit/react`), never a relative `../packages/...` or `dist` path — resolution to `dist` is the point.
- Smoke tests must NOT add a `coverage` block — they assert artifact behavior, not line coverage, and must not affect the per-package coverage floors.
- The `smoke/` workspace requires all packages built (`npm run build`) before it can run; the CI `verify` job already builds them.
- Assert DOM without `@testing-library/jest-dom` matchers (no setup file) — use `.textContent` / `wrapper.text()` and plain `expect(...).toBe(...)`.

---

### Task 1: Scaffold the `smoke/` workspace + React render-smoke

**Files:**
- Create: `smoke/package.json`
- Create: `smoke/vitest.config.ts`
- Create: `smoke/globalSetup.ts`
- Create: `smoke/react.smoke.test.tsx`
- Modify: `package.json` (root) — add `"smoke"` to `workspaces`

**Interfaces:**
- Consumes: from `@dynamic-field-kit/react` (built dist) — `DynamicInput` (default-exported component, prop `type: string`, `value?: unknown`), `FieldRegistryProvider` (props `registry`, `children`), `FieldRegistry` (class with `register(type, renderer)`).
- Produces: the `@dynamic-field-kit/smoke` workspace with `scripts.test = "vitest run"`; `smoke/globalSetup.ts` default-exports a `() => void` dist preflight reused by later tasks.

- [ ] **Step 1: Register the workspace**

Modify root `package.json` `workspaces` from `["packages/*"]` to:

```json
  "workspaces": [
    "packages/*",
    "smoke"
  ],
```

- [ ] **Step 2: Create `smoke/package.json`**

```json
{
  "name": "@dynamic-field-kit/smoke",
  "version": "0.0.0",
  "private": true,
  "description": "Render smoke tests against the built (dist) packages, as a real consumer.",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@dynamic-field-kit/core": "*",
    "@dynamic-field-kit/react": "*",
    "@dynamic-field-kit/vue": "*"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.0.0",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "@vue/test-utils": "^2.4.6",
    "jsdom": "^24.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "vitest": "^1.6.0",
    "vue": "^3.5.0"
  }
}
```

- [ ] **Step 3: Create `smoke/globalSetup.ts` (dist preflight)**

```ts
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs once before any smoke test file loads. A static `import` from a package
// whose dist is missing would otherwise fail with an opaque resolution stack;
// this turns it into a readable "build first" error.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const requiredArtifacts = [
  'packages/core/dist/index.js',
  'packages/react/dist/index.mjs',
  'packages/vue/dist/index.js',
];

export default function globalSetup(): void {
  const missing = requiredArtifacts.filter(
    (rel) => !existsSync(resolve(repoRoot, rel))
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing build artifact(s): ${missing.join(', ')}. ` +
        `Run "npm run build" (all packages) before the smoke tests.`
    );
  }
}
```

- [ ] **Step 4: Create `smoke/vitest.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    globalSetup: ['./globalSetup.ts'],
    include: ['*.smoke.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: Write the React smoke test `smoke/react.smoke.test.tsx`**

```tsx
import {
  DynamicInput,
  FieldRegistry,
  FieldRegistryProvider,
} from '@dynamic-field-kit/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

// Augment so registry.register('text', …) is well-typed for editors/tsc.
declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

const TextRenderer = ({ value }: { value?: string }) => (
  <div data-testid="smoke">{value}</div>
);

describe('react built package renders', () => {
  it('mounts a DynamicInput from the built dist and renders its value', () => {
    const registry = new FieldRegistry();
    registry.register('text', TextRenderer as never);

    render(
      <FieldRegistryProvider registry={registry as never}>
        <DynamicInput type="text" value="hi" />
      </FieldRegistryProvider>
    );

    expect(screen.getByTestId('smoke').textContent).toBe('hi');
  });
});
```

- [ ] **Step 6: Install so the new workspace is linked**

Run: `npm install`
Expected: completes; `@dynamic-field-kit/smoke` appears under workspaces (no error about an unknown workspace).

- [ ] **Step 7: Build the packages the smoke needs**

Run: `npm run build --workspace=@dynamic-field-kit/core && npm run build --workspace=@dynamic-field-kit/react`
Expected: both builds succeed; `packages/react/dist/index.mjs` exists.

- [ ] **Step 8: Run the React smoke — verify it passes**

Run: `npm run test --workspace=@dynamic-field-kit/smoke`
Expected: PASS — `react.smoke.test.tsx (1 test)`, 1 passed.

- [ ] **Step 9: Prove it bites (temporary break)**

Run: `mv packages/react/dist/index.mjs packages/react/dist/index.mjs.bak && npm run test --workspace=@dynamic-field-kit/smoke; mv packages/react/dist/index.mjs.bak packages/react/dist/index.mjs`
Expected: FAIL with the preflight message "Missing build artifact(s): packages/react/dist/index.mjs …"; after the `mv` back, the file is restored.

- [ ] **Step 10: Commit**

```bash
git add smoke package.json package-lock.json
git commit -m "test(smoke): render React DynamicInput from built dist"
```

---

### Task 2: Vue render-smoke

**Files:**
- Create: `smoke/vue.smoke.test.ts`

**Interfaces:**
- Consumes: from `@dynamic-field-kit/vue` (built dist) — `DynamicInput` (default component, props `type`, `value`), `FieldRegistryKey` (vue `InjectionKey`), `FieldRegistry` (class). Uses `@vue/test-utils` `mount` with `global.provide` (the DI mechanism from item 6).
- Produces: `smoke/vue.smoke.test.ts`, matched by the existing `*.smoke.test.{ts,tsx}` include.

- [ ] **Step 1: Write the Vue smoke test `smoke/vue.smoke.test.ts`**

```ts
import {
  DynamicInput,
  FieldRegistry,
  FieldRegistryKey,
} from '@dynamic-field-kit/vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

const TextRenderer = {
  props: ['value'],
  template: '<div data-testid="smoke">{{ value }}</div>',
};

describe('vue built package renders', () => {
  it('mounts a DynamicInput from the built dist and renders its value', () => {
    const registry = new FieldRegistry();
    registry.register('text', TextRenderer as never);

    const wrapper = mount(DynamicInput, {
      props: { type: 'text', value: 'hi' },
      global: { provide: { [FieldRegistryKey]: registry } },
    });

    expect(wrapper.get('[data-testid="smoke"]').text()).toBe('hi');
  });
});
```

- [ ] **Step 2: Build the vue package**

Run: `npm run build --workspace=@dynamic-field-kit/vue`
Expected: succeeds; `packages/vue/dist/index.js` exists.

- [ ] **Step 3: Run the smoke suite — verify both pass**

Run: `npm run test --workspace=@dynamic-field-kit/smoke`
Expected: PASS — 2 test files (`react.smoke.test.tsx`, `vue.smoke.test.ts`), 2 passed.

- [ ] **Step 4: Prove the Vue path bites**

Run: `mv packages/vue/dist/index.js packages/vue/dist/index.js.bak && npm run test --workspace=@dynamic-field-kit/smoke; mv packages/vue/dist/index.js.bak packages/vue/dist/index.js`
Expected: FAIL with preflight "Missing build artifact(s): packages/vue/dist/index.js …"; file restored afterward.

- [ ] **Step 5: Commit**

```bash
git add smoke/vue.smoke.test.ts
git commit -m "test(smoke): render Vue DynamicInput from built dist"
```

---

### Task 3: Angular render-smoke (best-effort)

**Files:**
- Create (only if it works cleanly): `smoke/angular.smoke.test.ts`
- Modify (only if pursued): `smoke/package.json` (add angular deps), `smoke/globalSetup.ts` (add angular artifact), `smoke/vitest.config.ts` (no change expected)

**Interfaces:**
- Consumes: from `@dynamic-field-kit/angular` (built fesm2022) — `DynamicInput` component, `FIELD_REGISTRY` injection token, `FieldRegistry`. Uses `@angular/core/testing` `TestBed` + `@angular/platform-browser-dynamic/testing` + `zone.js`.
- Produces: either an Angular smoke test, OR a documented decision to skip it (per the spec's best-effort clause).

- [ ] **Step 1: Decide the timebox and add deps to attempt**

Add to `smoke/package.json` devDependencies (then run `npm install`):

```json
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "zone.js": "^0.15.0",
```

Add `"@dynamic-field-kit/angular": "*"` to `smoke/package.json` dependencies, and `'packages/angular/dist/fesm2022/dynamic-field-kit-angular.mjs'` (confirmed filename; angular has no `exports` map — its `module` field points here) to `requiredArtifacts` in `smoke/globalSetup.ts`.

- [ ] **Step 2: Write the Angular smoke test `smoke/angular.smoke.test.ts`**

```ts
import 'zone.js';
import 'zone.js/testing';
import {
  DynamicInput,
  FIELD_REGISTRY,
  FieldRegistry,
} from '@dynamic-field-kit/angular';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { By } from '@angular/platform-browser';
import { beforeAll, describe, expect, it } from 'vitest';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

@Component({
  selector: 'dfk-smoke-text',
  standalone: true,
  template: '<div class="smoke">{{ value }}</div>',
})
class TextRenderer {
  @Input() value?: unknown;
}

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
});

describe('angular built package renders', () => {
  it('mounts a DynamicInput from the built dist and renders its value', () => {
    const registry = new FieldRegistry();
    registry.register('text', TextRenderer as never);

    TestBed.configureTestingModule({
      imports: [DynamicInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('value', 'hi');
    fixture.detectChanges();

    const el = fixture.debugElement.query(By.css('.smoke'));
    expect(el.nativeElement.textContent).toBe('hi');
  });
});
```

- [ ] **Step 3: Build angular and run the smoke suite**

Run: `npm run build --workspace=@dynamic-field-kit/angular && npm run test --workspace=@dynamic-field-kit/smoke`
Expected (success case): PASS — 3 test files, all passed.

- [ ] **Step 4: Apply the drop criteria**

If Step 3 fails because the built component needs the JIT compiler, or requires bootstrapping beyond the standard `initTestEnvironment` above, or is non-deterministic (zone/async flakiness): **revert this task entirely** —

```bash
git checkout smoke/package.json smoke/globalSetup.ts
rm -f smoke/angular.smoke.test.ts
npm install
```

— and add this line to the smoke workspace by creating `smoke/README.md`:

```markdown
# @dynamic-field-kit/smoke

Render smoke tests that import each adapter's **built dist** as a real consumer
would and mount a component through the real framework runtime on jsdom.

- React (`react.smoke.test.tsx`) and Vue (`vue.smoke.test.ts`) are covered here.
- Angular is intentionally **not** render-smoked: mounting its built fesm2022
  output via TestBed outside a real Angular app needs JIT/app bootstrapping that
  is too fragile for a smoke test. Angular's built dist stays covered at the
  import + registry-wiring level by `scripts/integration-cross-registry.js`.
```

- [ ] **Step 5: Commit (either outcome)**

Success case:
```bash
git add smoke/angular.smoke.test.ts smoke/package.json smoke/globalSetup.ts package-lock.json
git commit -m "test(smoke): render Angular DynamicInput from built dist"
```

Drop case:
```bash
git add smoke/README.md package.json package-lock.json
git commit -m "docs(smoke): document why Angular is not render-smoked"
```

---

### Task 4: Wire the smoke into CI + final verification

**Files:**
- Modify: `.github/workflows/ci.yml` (the `verify` job)

**Interfaces:**
- Consumes: the `@dynamic-field-kit/smoke` workspace `test` script.
- Produces: a blocking CI step; no downstream consumers.

- [ ] **Step 1: Add the smoke step to the `verify` job**

In `.github/workflows/ci.yml`, in the `verify` job, immediately after the `Build packages` step, add:

```yaml
      - name: Smoke test built packages
        run: npm run test --workspace=@dynamic-field-kit/smoke
```

(The `verify` job already runs `npm ci` and builds all four packages before this point, so the smoke's `dist` dependencies are present.)

- [ ] **Step 2: Full local gate — build everything, then smoke**

Run: `npm run build --workspace=@dynamic-field-kit/core && npm run build --workspace=@dynamic-field-kit/react && npm run build --workspace=@dynamic-field-kit/vue && npm run build --workspace=@dynamic-field-kit/angular && npm run test --workspace=@dynamic-field-kit/smoke`
Expected: PASS — the smoke suite (2 tests, or 3 if Angular was kept).

- [ ] **Step 3: Confirm nothing else regressed**

Run: `npm run lint && npm run format-check`
Expected: both pass (the `smoke/` tests are not under the lint globs; format-check covers them — if it flags any smoke file, run `npx prettier --write smoke` and re-check).

- [ ] **Step 4: Confirm the existing verify scripts still pass**

Run: `node scripts/verify-framework-deps.js && node scripts/check-cross-framework-imports.js && node scripts/integration-cross-registry.js`
Expected: all exit 0.

- [ ] **Step 5: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run built-package render smoke in the verify job"
git push -u origin feat/published-package-smoke
```

---

## Notes for the implementer

- **Root `npm test` behavior:** because `smoke` is now a workspace, `npm test` at the repo root (which fans out `--workspaces --if-present`) will include the smoke suite, which needs `dist` present. Without a prior build it fails with the friendly preflight message. This is expected; CI's per-package test matrix uses explicit `--workspace=` commands and is unaffected. Do not try to "fix" this by renaming the smoke `test` script — the CI verify step and `--workspace=@dynamic-field-kit/smoke` rely on it being `test`.
- **Why `globalSetup`, not `beforeAll`:** a static top-level `import` from a missing dist throws at module-load, before any `beforeAll` in the file runs. `globalSetup` runs before test modules load, so it can produce the readable error first.
