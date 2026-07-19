# Angular Test Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Angular package's fake test suite with real mounted-component tests running on vitest + jsdom, and remove Chrome from CI.

**Architecture:** Delete karma/jasmine/karma-typescript, which cannot bundle any import. Compile Angular for vitest with `@analogjs/vite-plugin-angular`, initialise TestBed from a `setupFiles` entry that actually loads, and cover `packages/angular/src` with tests that mount components through TestBed.

**Tech Stack:** vitest 1.6, jsdom 24, `@analogjs/vite-plugin-angular` 1.16, `@analogjs/vitest-angular` 1.16, `@angular-devkit/build-angular` 19, `@vitest/coverage-v8`, Angular 19, zone.js 0.15.

Spec: `docs/superpowers/specs/2026-07-16-angular-test-overhaul-design.md`

## Global Constraints

- Work on branch `feat/angular-test-overhaul`, based on `develop`.
- Never append a `Co-Authored-By: Claude ...` trailer or any Claude attribution to commits. End the commit message at the last content line.
- Build `@dynamic-field-kit/core` before running Angular tests — the adapter resolves `@dynamic-field-kit/core` from its built `dist`, via the workspace symlink in `node_modules/@dynamic-field-kit/core`.
- Do not change Angular's public API or the renderer contract. The only `src/` change permitted is the `isComponentType` fix in Task 3.
- Angular peer range is `>=13 <22`. Do not use Angular APIs newer than v13 in `src/`. (`reflectComponentType` is v14+, so it is NOT used; Task 3 uses the `ɵcmp` static instead.)
- Test env is jsdom. No browser, no karma, no jasmine.
- Vitest version must be `^1.6.0` and jsdom `^24.0.0`, matching `packages/react` and `packages/vue`.
- Tests use `new FieldRegistry()` provided through `FIELD_REGISTRY`. Never use the private-state hack `(fieldRegistry as any).registry = {}`.
- Prettier governs all files: run `npm run format-check` before every commit.
- Angular test count will drop well below 36. That is expected and is not a regression.

## File Structure

**Created:**

- `packages/angular/vitest.config.ts` — vitest + analog plugin config.
- `packages/angular/test/setup.ts` — zone.js + TestBed environment init. Loaded via `setupFiles`.
- `packages/angular/test/helpers/renderers.ts` — shared test renderer components and a registry factory. Every spec imports from here; no spec defines its own renderer.
- `packages/angular/test/DynamicInput.spec.ts` — Task 3, 4.
- `packages/angular/test/MultiFieldInput.spec.ts` — Task 5.
- `packages/angular/test/FieldInput.spec.ts` — Task 6.
- `packages/angular/test/layout.spec.ts` — Task 7 (layoutRegistry, defaultLayouts).
- `packages/angular/test/publicApi.spec.ts` — Task 7 (public-api, module, FIELD_REGISTRY token).

**Modified:**

- `packages/angular/package.json` — scripts and devDependencies.
- `packages/angular/src/components/DynamicInput.ts:138-142` — the `isComponentType` fix (Task 3).
- `.github/workflows/ci.yml` — drop Chrome, align test-cmd (Task 8).

**Deleted:**

- `packages/angular/karma.conf.js`, `packages/angular/tsconfig.spec.json`, `packages/angular/test.ts`
- `packages/angular/test/angular.spec.ts`, `test/DynamicInput.spec.ts`, `test/FieldInput.spec.ts`, `test/integration.spec.ts`, `test/layouts.spec.ts`

---

### Task 1: Stand up the vitest runner and prove TestBed mounts

**Files:**

- Create: `packages/angular/vitest.config.ts`
- Create: `packages/angular/test/setup.ts`
- Create: `packages/angular/test/smoke.spec.ts`
- Modify: `packages/angular/package.json`
- Delete: `packages/angular/karma.conf.js`, `packages/angular/tsconfig.spec.json`, `packages/angular/test.ts`, `packages/angular/test/angular.spec.ts`, `packages/angular/test/DynamicInput.spec.ts`, `packages/angular/test/FieldInput.spec.ts`, `packages/angular/test/integration.spec.ts`, `packages/angular/test/layouts.spec.ts`

**Interfaces:**

- Produces: a working `npm test --workspace=@dynamic-field-kit/angular` running vitest+jsdom with TestBed initialised. Every later task depends on this.

**THIS TASK IS A GATE.** If Step 6 cannot be made to pass, stop and report to the user with the exact error before starting Task 2. Do not write further tests against a runner that does not work.

- [ ] **Step 1: Remove the karma toolchain**

```bash
cd packages/angular
rm karma.conf.js tsconfig.spec.json test.ts
rm test/angular.spec.ts test/DynamicInput.spec.ts test/FieldInput.spec.ts test/integration.spec.ts test/layouts.spec.ts
```

- [ ] **Step 2: Swap dependencies**

Run from the repo root (workspace-aware):

```bash
npm uninstall --workspace=@dynamic-field-kit/angular karma karma-chrome-launcher karma-coverage karma-jasmine karma-typescript jasmine @types/jasmine
npm install --save-dev --workspace=@dynamic-field-kit/angular vitest@^1.6.0 jsdom@^24.0.0 @vitest/coverage-v8@^1.6.0 @analogjs/vite-plugin-angular@^1.16.1 @analogjs/vitest-angular@^1.16.1 @angular-devkit/build-angular@^19.0.0
```

Expected: install completes. `@angular-devkit/build-angular` is large; a few minutes is normal.

- [ ] **Step 3: Update the package scripts**

In `packages/angular/package.json`, replace the `test` and `test:coverage` scripts. Delete `test:coverage` entirely; CI will pass `--coverage` through, exactly as it does for react and vue.

```json
    "test": "vitest run",
```

The `clean` script keeps `dist-spec` in its rimraf list; drop it since karma-typescript no longer emits there:

```json
    "clean": "rimraf dist coverage",
```

- [ ] **Step 4: Create the vitest config**

Create `packages/angular/vitest.config.ts`:

```ts
/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['lcov', 'text-summary'],
      include: ['src/**/*.ts'],
    },
  },
});
```

- [ ] **Step 5: Create the setup file that actually gets loaded**

Create `packages/angular/test/setup.ts`. The `setup-zone` import must come first: it loads `zone.js` and `zone.js/testing` in the order Angular requires. This is the fix for the original bug where `test.ts` was never in karma's `files` list, so TestBed was never initialised.

```ts
import '@analogjs/vitest-angular/setup-zone';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);
```

- [ ] **Step 6: Write the smoke test — the gate**

Create `packages/angular/test/smoke.spec.ts`. This proves three things the old suite never could: an import works, a component compiles, and TestBed mounts it into jsdom.

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';

@Component({
  selector: 'dfk-smoke',
  standalone: true,
  template: `<span class="smoke">{{ label }}</span>`,
})
class SmokeComponent {
  label = 'mounted';
}

describe('vitest + Angular infrastructure', () => {
  it('imports @dynamic-field-kit/core', () => {
    expect(typeof fieldRegistry.register).toBe('function');
  });

  it('mounts a component through TestBed', () => {
    const fixture = TestBed.createComponent(SmokeComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement.querySelector('.smoke');
    expect(el.textContent).toBe('mounted');
  });
});
```

- [ ] **Step 7: Build core, then run the smoke test**

```bash
npm run build --workspace=@dynamic-field-kit/core
npm run test --workspace=@dynamic-field-kit/angular
```

Expected: 2 passed.

If it fails on zone.js (`Zone is not defined`, or `NG0908: In this configuration Angular requires Zone.js`), the fallback is to replace the first line of `test/setup.ts` with explicit imports in this exact order and re-run:

```ts
import 'zone.js';
import 'zone.js/testing';
```

If it still fails, **stop and report to the user.** Include the full error. Do not proceed to Task 2.

- [ ] **Step 8: Commit**

```bash
git add packages/angular/vitest.config.ts packages/angular/test/setup.ts packages/angular/test/smoke.spec.ts packages/angular/package.json package-lock.json
git add -u packages/angular
git commit -m "test(angular): replace karma with vitest + jsdom

karma-typescript could not bundle any import: a spec importing only
@angular/core failed with 'exports is not defined', which is why every
existing spec asserted tautologies instead of importing the package.
karma.conf.js also never loaded test.ts, so TestBed was never initialised.

Runs on vitest 1.6 + jsdom 24, matching react and vue, with Angular
compiled by @analogjs/vite-plugin-angular. Deletes the five tautological
specs; real tests follow."
```

---

### Task 2: Shared test renderers

**Files:**

- Create: `packages/angular/test/helpers/renderers.ts`

**Interfaces:**

- Consumes: the working runner from Task 1.
- Produces:

  - `TextRendererComponent` — standalone Angular component, selector `dfk-test-text`. Inputs: `value?: unknown`, `label?: string`, `placeholder?: string`, `required?: boolean`, `disabled?: boolean`, `readOnly?: boolean`, `error?: string | string[]`, `options?: unknown[]`, `className?: string`, `description?: string`, `hint?: string`. Output: `valueChange: EventEmitter<unknown>`. Renders `<input class="txt">`; `<span class="err">` when `error` is set; `<span class="hint">` when `hint` is set.
  - `LegacyOutputRendererComponent` — standalone, selector `dfk-test-legacy`. Output is named `onValueChange: EventEmitter<unknown>` (not `valueChange`). Renders `<button class="legacy-btn">`.
  - `fallbackRenderer: (props: Record<string, unknown>) => string` — a plain function renderer returning an HTML string.
  - `makeRegistry(): FieldRegistry` — returns `new FieldRegistry()`, empty.

- [ ] **Step 1: Write the helper**

Create `packages/angular/test/helpers/renderers.ts`:

```ts
import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldRegistry } from '@dynamic-field-kit/core';

@Component({
  selector: 'dfk-test-text',
  standalone: true,
  imports: [NgIf],
  template: `
    <input
      class="txt"
      [value]="value ?? ''"
      [disabled]="!!disabled"
      [readOnly]="!!readOnly"
      [placeholder]="placeholder ?? ''"
      (input)="valueChange.emit($any($event.target).value)"
    />
    <span class="err" *ngIf="error">{{ errorText }}</span>
    <span class="hint" *ngIf="hint">{{ hint }}</span>
  `,
})
export class TextRendererComponent {
  @Input() value?: unknown;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() required?: boolean;
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() error?: string | string[];
  @Input() options?: unknown[];
  @Input() className?: string;
  @Input() description?: string;
  // Not a FieldRendererProps key: proves extraProps reach the instance.
  @Input() hint?: string;

  @Output() valueChange = new EventEmitter<unknown>();

  get errorText(): string {
    return ([] as string[]).concat(this.error ?? []).join(', ');
  }
}

@Component({
  selector: 'dfk-test-legacy',
  standalone: true,
  template: `<button class="legacy-btn" (click)="onValueChange.emit('legacy')">
    go
  </button>`,
})
export class LegacyOutputRendererComponent {
  @Input() value?: unknown;
  // Deliberately the legacy output name, to cover DynamicInput.bindOutputs.
  @Output() onValueChange = new EventEmitter<unknown>();
}

export function fallbackRenderer(props: Record<string, unknown>): string {
  return `<span class="fallback">${String(props['label'] ?? '')}:${String(
    props['value'] ?? ''
  )}</span>`;
}

export function makeRegistry(): FieldRegistry {
  return new FieldRegistry();
}
```

The `*ngIf` in `TextRendererComponent` needs `NgIf`. Add it to the imports array:

```ts
import { NgIf } from '@angular/common';
```

and set `imports: [NgIf]` on `TextRendererComponent`.

- [ ] **Step 2: Verify it compiles**

The helper has no spec of its own; Task 3 is the first to import it. Confirm nothing broke:

Run: `npm run test --workspace=@dynamic-field-kit/angular`
Expected: 2 passed (the smoke tests).

- [ ] **Step 3: Commit**

```bash
git add packages/angular/test/helpers/renderers.ts
git commit -m "test(angular): add shared test renderer components"
```

---

### Task 3: Confirm and fix the `isComponentType` bug

**Files:**

- Create: `packages/angular/test/DynamicInput.spec.ts`
- Modify: `packages/angular/src/components/DynamicInput.ts:138-142`

**Interfaces:**

- Consumes: `TextRendererComponent`, `makeRegistry` from Task 2.
- Produces: a `DynamicInput` that renders registered Angular component classes. Tasks 4-6 depend on this working.

**Context:** `src/components/DynamicInput.ts:138-142` is:

```ts
private isComponentType(renderer: unknown): boolean {
  return (
    typeof renderer === 'object' && renderer !== null && 'cmp' in renderer
  );
}
```

The README registers renderers as classes (`fieldRegistry.register('text', TextFieldComponent as any)`). A class is `typeof 'function'`, so this returns `false`, `render()` falls through to `renderFallback`, calls the class without `new`, throws `TypeError`, and the `catch` renders the red "Failed to render field" div. Step 2 proves it; Step 4 fixes it.

- [ ] **Step 1: Write the failing test**

Create `packages/angular/test/DynamicInput.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { DynamicInput } from '../src/components/DynamicInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

describe('DynamicInput', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    TestBed.configureTestingModule({
      imports: [DynamicInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  it('renders a registered Angular component class', () => {
    registry.register('text', TextRendererComponent as never);

    const fixture = TestBed.createComponent(DynamicInput);
    fixture.componentRef.setInput('type', 'text');
    fixture.componentRef.setInput('value', 'hello');
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input).not.toBeNull();
    expect(input.value).toBe('hello');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- DynamicInput`

Expected: FAIL. `input.txt` is null because the component rendered the error div instead. This is the bug confirmed at runtime. Record the actual message — the rendered DOM should contain "Failed to render field: text".

- [ ] **Step 3: Report the confirmation**

The design spec (`## Suspected bug: isComponentType`) says Phase 1's first mounted test decides the hypothesis. It is now decided. State the evidence plainly in the commit message at Step 6 — no need to pause the plan; the user pre-approved fixing it in this cycle.

- [ ] **Step 4: Fix the predicate**

In `packages/angular/src/components/DynamicInput.ts`, replace `isComponentType`:

```ts
  // Angular component classes carry a static ɵcmp. Checked instead of
  // reflectComponentType() because the peer range starts at Angular 13 and
  // reflectComponentType is v14+. Plain function renderers have no ɵcmp and
  // fall through to renderFallback.
  private isComponentType(renderer: unknown): boolean {
    return typeof renderer === 'function' && 'ɵcmp' in renderer;
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- DynamicInput`
Expected: PASS.

Then run the whole suite to confirm nothing regressed:

Run: `npm run test --workspace=@dynamic-field-kit/angular`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/angular/test/DynamicInput.spec.ts packages/angular/src/components/DynamicInput.ts
git commit -m "fix(angular): render registered component classes

isComponentType required typeof renderer === 'object' with a 'cmp' key,
but the documented way to register an Angular renderer is a class, which
is typeof 'function' and carries a static named 'ɵcmp'. Every component
class therefore fell through to renderFallback, was called without new,
threw TypeError, and rendered the red 'Failed to render field' div — the
adapter's primary use case never worked.

No test could catch it before: karma could not bundle imports, so no spec
ever mounted a component. The new mounted test fails without this fix."
```

---

### Task 4: Cover the rest of `DynamicInput`

**Files:**

- Modify: `packages/angular/test/DynamicInput.spec.ts`

**Interfaces:**

- Consumes: `TextRendererComponent`, `LegacyOutputRendererComponent`, `fallbackRenderer`, `makeRegistry` from Task 2.

- [ ] **Step 1: Add the behaviour tests**

Append inside the existing `describe('DynamicInput', ...)` block in `packages/angular/test/DynamicInput.spec.ts`. Add these imports to the existing import block:

```ts
import {
  LegacyOutputRendererComponent,
  fallbackRenderer,
} from './helpers/renderers';
```

```ts
it('forwards KNOWN_PROPS to the rendered instance', () => {
  registry.register('text', TextRendererComponent as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.componentRef.setInput('placeholder', 'Your name');
  fixture.componentRef.setInput('disabled', true);
  fixture.detectChanges();

  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('input.txt');
  expect(input.placeholder).toBe('Your name');
  expect(input.disabled).toBe(true);
});

it('forwards extraProps verbatim', () => {
  registry.register('text', TextRendererComponent as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.componentRef.setInput('extraProps', { hint: 'be brief' });
  fixture.detectChanges();

  expect(fixture.nativeElement.querySelector('.hint').textContent).toBe(
    'be brief'
  );
});

it('syncs prop changes to an already-rendered instance', () => {
  registry.register('text', TextRendererComponent as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.componentRef.setInput('value', 'first');
  fixture.detectChanges();

  fixture.componentRef.setInput('value', 'second');
  fixture.detectChanges();

  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('input.txt');
  expect(input.value).toBe('second');
});

it('emits valueChange and onChange when the renderer emits valueChange', () => {
  registry.register('text', TextRendererComponent as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.detectChanges();

  const seen: unknown[] = [];
  const legacy: unknown[] = [];
  fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));
  fixture.componentInstance.onChange.subscribe((v) => legacy.push(v));

  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('input.txt');
  input.value = 'typed';
  input.dispatchEvent(new Event('input'));

  expect(seen).toEqual(['typed']);
  expect(legacy).toEqual(['typed']);
});

it('binds the legacy onValueChange output name', () => {
  registry.register('text', LegacyOutputRendererComponent as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.detectChanges();

  const seen: unknown[] = [];
  fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));

  fixture.nativeElement.querySelector('button.legacy-btn').click();

  expect(seen).toEqual(['legacy']);
});

it('renders a plain function renderer as fallback HTML', () => {
  registry.register('text', fallbackRenderer as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.componentRef.setInput('label', 'Name');
  fixture.componentRef.setInput('value', 'Ada');
  fixture.detectChanges();

  expect(fixture.nativeElement.querySelector('.fallback').textContent).toBe(
    'Name:Ada'
  );
});

it('renders an error for an unknown field type', () => {
  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'nope');
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain(
    'Unknown field type: nope'
  );
});

it('re-renders when type changes', () => {
  registry.register('text', TextRendererComponent as never);
  registry.register('number', fallbackRenderer as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('input.txt')).not.toBeNull();

  fixture.componentRef.setInput('type', 'number');
  fixture.detectChanges();

  expect(fixture.nativeElement.querySelector('input.txt')).toBeNull();
  expect(fixture.nativeElement.querySelector('.fallback')).not.toBeNull();
});

it('unsubscribes from renderer outputs on destroy', () => {
  registry.register('text', TextRendererComponent as never);

  const fixture = TestBed.createComponent(DynamicInput);
  fixture.componentRef.setInput('type', 'text');
  fixture.detectChanges();

  const seen: unknown[] = [];
  fixture.componentInstance.valueChange.subscribe((v) => seen.push(v));

  const input: HTMLInputElement =
    fixture.nativeElement.querySelector('input.txt');
  fixture.destroy();

  input.value = 'after destroy';
  input.dispatchEvent(new Event('input'));

  expect(seen).toEqual([]);
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- DynamicInput`
Expected: 10 passed.

If `unsubscribes from renderer outputs on destroy` fails because the detached DOM node no longer fires, assert on the subscription count instead: capture `fixture.componentInstance` before destroy and assert that a post-destroy `emitValue` produces nothing. Do not weaken the test to a tautology.

- [ ] **Step 3: Commit**

```bash
git add packages/angular/test/DynamicInput.spec.ts
git commit -m "test(angular): cover DynamicInput rendering, prop sync, outputs, cleanup"
```

---

### Task 5: Cover `MultiFieldInput`

**Files:**

- Create: `packages/angular/test/MultiFieldInput.spec.ts`

**Interfaces:**

- Consumes: `TextRendererComponent`, `makeRegistry` from Task 2.
- `MultiFieldInput` inputs: `fieldDescriptions: FieldDescription[]`, `properties?: Properties`, `layout: LayoutConfig`, `rootData?: Properties`. Outputs: `onChange: EventEmitter<Properties>`, `validityChange: EventEmitter<ValidationResult>`.

- [ ] **Step 1: Write the tests**

Create `packages/angular/test/MultiFieldInput.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import type {
  FieldDescription,
  ValidationResult,
} from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

describe('MultiFieldInput', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mount(
    fields: FieldDescription[],
    properties: Record<string, unknown>
  ) {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', fields);
    fixture.componentRef.setInput('properties', properties);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one input per field', () => {
    const fixture = mount(
      [
        { name: 'first', type: 'text' },
        { name: 'last', type: 'text' },
      ],
      { first: 'Ada', last: 'Lovelace' }
    );

    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input.txt')
    );
    expect(inputs.map((i) => i.value)).toEqual(['Ada', 'Lovelace']);
  });

  it('hides fields whose appearCondition is false', () => {
    const fields: FieldDescription[] = [
      { name: 'kind', type: 'text' },
      {
        name: 'company',
        type: 'text',
        appearCondition: (data) => data['kind'] === 'business',
      },
    ];

    expect(
      mount(fields, { kind: 'personal' }).nativeElement.querySelectorAll(
        'input.txt'
      ).length
    ).toBe(1);
    expect(
      mount(fields, { kind: 'business' }).nativeElement.querySelectorAll(
        'input.txt'
      ).length
    ).toBe(2);
  });

  it('applies computeValue to the data it emits', () => {
    const fields: FieldDescription[] = [
      { name: 'price', type: 'text' },
      {
        name: 'total',
        type: 'text',
        computeValue: (data) => `${Number(data['price']) * 2}`,
      },
    ];

    const fixture = mount(fields, { price: '5' });

    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input.txt')
    );
    expect(inputs[1].value).toBe('10');
  });

  it('emits onChange with the updated data when a field changes', () => {
    const fixture = mount([{ name: 'first', type: 'text' }], { first: 'Ada' });

    const seen: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((d) => seen.push(d));

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));

    expect(seen).toEqual([{ first: 'Grace' }]);
  });

  it('passes validation errors down to the renderer', () => {
    const fixture = mount(
      [
        {
          name: 'email',
          type: 'text',
          validate: (value) =>
            String(value).includes('@') ? undefined : 'Invalid email',
        },
      ],
      { email: 'nope' }
    );

    expect(fixture.nativeElement.querySelector('.err').textContent).toBe(
      'Invalid email'
    );
  });

  it('resolves disabledCondition and readOnlyCondition', () => {
    const fixture = mount(
      [
        {
          name: 'a',
          type: 'text',
          disabledCondition: (data) => data['frozen'] === true,
        },
        {
          name: 'b',
          type: 'text',
          readOnlyCondition: (data) => data['frozen'] === true,
        },
      ],
      { frozen: true }
    );

    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input.txt')
    );
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[1].readOnly).toBe(true);
  });

  it('does not report errors for disabled fields', () => {
    const fixture = mount(
      [
        {
          name: 'email',
          type: 'text',
          disabled: true,
          validate: () => 'Invalid email',
        },
      ],
      { email: 'nope' }
    );

    expect(fixture.nativeElement.querySelector('.err')).toBeNull();
  });

  it('emits validityChange on init and on every change', () => {
    const seen: ValidationResult[] = [];
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentInstance.validityChange.subscribe((r) => seen.push(r));
    fixture.componentRef.setInput('fieldDescriptions', [
      {
        name: 'email',
        type: 'text',
        validate: (value: unknown) =>
          String(value).includes('@') ? undefined : 'Invalid email',
      },
    ]);
    fixture.componentRef.setInput('properties', { email: 'nope' });
    fixture.detectChanges();

    expect(seen[seen.length - 1]).toEqual({
      valid: false,
      errors: { email: ['Invalid email'] },
    });

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'ada@example.com';
    input.dispatchEvent(new Event('input'));

    expect(seen[seen.length - 1]).toEqual({ valid: true, errors: {} });
  });

  it('renders a repeatable group item per entry and adds one on Add', () => {
    const fields: FieldDescription[] = [
      {
        name: 'contacts',
        type: 'text',
        label: 'Contacts',
        fields: [{ name: 'email', type: 'text' }],
      },
    ];

    const fixture = mount(fields, {
      contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    });

    expect(fixture.nativeElement.querySelectorAll('input.txt').length).toBe(2);

    const seen: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((d) => seen.push(d));

    const addBtn: HTMLButtonElement = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button')
    ).find((b) => b.textContent?.trim() === 'Add')!;
    addBtn.click();
    fixture.detectChanges();

    expect((seen[0] as Record<string, unknown[]>)['contacts'].length).toBe(3);
  });

  it('removes a group item on Remove', () => {
    const fields: FieldDescription[] = [
      {
        name: 'contacts',
        type: 'text',
        fields: [{ name: 'email', type: 'text' }],
      },
    ];

    const fixture = mount(fields, {
      contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    });

    const seen: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((d) => seen.push(d));

    const removeBtn: HTMLButtonElement = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button')
    ).find((b) => b.textContent?.trim() === 'Remove')!;
    removeBtn.click();
    fixture.detectChanges();

    expect((seen[0] as Record<string, unknown[]>)['contacts']).toEqual([
      { email: 'b@x.com' },
    ]);
  });

  it('applies the grid layout', () => {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', [
      { name: 'a', type: 'text' },
    ]);
    fixture.componentRef.setInput('properties', { a: '1' });
    fixture.componentRef.setInput('layout', { type: 'grid', columns: 3 });
    fixture.detectChanges();

    const container: HTMLElement = fixture.nativeElement.firstElementChild;
    expect(container.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- MultiFieldInput`
Expected: 12 passed.

Note on the group tests: the nested `<dfk-multi-field-input>` emits its own `validityChange`/`onChange`, so `seen[0]` is the first emission from the **outer** component only because the subscription is on the outer instance. If a group test fails on emission ordering, assert with `seen[seen.length - 1]` rather than deleting the assertion.

- [ ] **Step 3: Commit**

```bash
git add packages/angular/test/MultiFieldInput.spec.ts
git commit -m "test(angular): cover MultiFieldInput fields, conditions, groups, validity"
```

---

### Task 6: Cover `FieldInput` and `BaseInput`

**Files:**

- Create: `packages/angular/test/FieldInput.spec.ts`

**Interfaces:**

- Consumes: `TextRendererComponent`, `makeRegistry` from Task 2.
- `FieldInput` inputs: `fieldDescription?: FieldDescription`, `value?: unknown`, `disabled?: boolean`, `readOnly?: boolean`, `error?: string | string[]`. Output: `onValueChangeField: EventEmitter<{ value: unknown; key: string }>`.

- [ ] **Step 1: Write the tests**

Create `packages/angular/test/FieldInput.spec.ts`:

```ts
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseInputComponent } from '../src/components/BaseInput';
import { FieldInput } from '../src/components/FieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

describe('FieldInput', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [FieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  it('renders nothing without a fieldDescription', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input.txt')).toBeNull();
  });

  it('renders the field described by fieldDescription', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
      placeholder: 'First name',
    });
    fixture.componentRef.setInput('value', 'Ada');
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input.value).toBe('Ada');
    expect(input.placeholder).toBe('First name');
  });

  it('emits onValueChangeField with the field name as key', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
    });
    fixture.detectChanges();

    const seen: unknown[] = [];
    fixture.componentInstance.onValueChangeField.subscribe((e) => seen.push(e));

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));

    expect(seen).toEqual([{ value: 'Grace', key: 'first' }]);
  });

  it('forwards error, disabled and readOnly to the renderer', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'email',
      type: 'text',
    });
    fixture.componentRef.setInput('error', ['Required', 'Invalid']);
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(fixture.nativeElement.querySelector('.err').textContent).toBe(
      'Required, Invalid'
    );
  });

  it('forwards FieldDescription.props as extraProps', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
      props: { hint: 'keep it short' },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hint').textContent).toBe(
      'keep it short'
    );
  });
});

describe('BaseInputComponent', () => {
  class TestInput extends BaseInputComponent {}

  it('marks for check on input changes', () => {
    const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
    const input = new TestInput(cdr);

    input.ngOnChanges({});

    expect(cdr.markForCheck).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- FieldInput`
Expected: 6 passed.

- [ ] **Step 3: Commit**

```bash
git add packages/angular/test/FieldInput.spec.ts
git commit -m "test(angular): cover FieldInput forwarding and BaseInput change detection"
```

---

### Task 7: Cover layout, the registry token, the module, and the public API

**Files:**

- Create: `packages/angular/test/layout.spec.ts`
- Create: `packages/angular/test/publicApi.spec.ts`

**Interfaces:**

- Consumes: `makeRegistry`, `TextRendererComponent` from Task 2.

- [ ] **Step 1: Write the layout tests**

Create `packages/angular/test/layout.spec.ts`:

```ts
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ColumnLayout,
  GridLayout,
  RowLayout,
} from '../src/layout/defaultLayouts';
import { LayoutRegistry, layoutRegistry } from '../src/layout/layoutRegistry';

@Component({
  standalone: true,
  imports: [ColumnLayout, RowLayout, GridLayout],
  template: `
    <ng-template #tpl><span class="child">x</span></ng-template>
    <dfk-column-layout
      [template]="tpl"
      [config]="{ gap: 20 }"
    ></dfk-column-layout>
    <dfk-row-layout [template]="tpl"></dfk-row-layout>
    <dfk-grid-layout
      [template]="tpl"
      [config]="{ columns: 3 }"
    ></dfk-grid-layout>
  `,
})
class LayoutHost {
  @ViewChild('tpl', { static: true }) tpl!: TemplateRef<unknown>;
}

describe('LayoutRegistry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers and retrieves a layout', () => {
    const registry = new LayoutRegistry();
    registry.register('custom', ColumnLayout);

    expect(registry.get('custom')).toBe(ColumnLayout);
  });

  it('returns undefined for an unknown layout', () => {
    expect(new LayoutRegistry().get('nope')).toBeUndefined();
  });

  it('warns when a layout type is registered twice', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const registry = new LayoutRegistry();
    registry.register('custom', ColumnLayout);
    registry.register('custom', RowLayout);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(registry.get('custom')).toBe(RowLayout);
  });

  it('exports a shared registry instance', () => {
    expect(layoutRegistry).toBeInstanceOf(LayoutRegistry);
  });
});

describe('default layouts', () => {
  it('renders the projected template with the configured gap', () => {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();

    const column: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-column-layout > div'
    );
    expect(column.style.flexDirection).toBe('column');
    expect(column.style.gap).toBe('20px');
    expect(column.querySelector('.child')).not.toBeNull();
  });

  it('defaults the gap to 12px', () => {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();

    const row: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-row-layout > div'
    );
    expect(row.style.flexDirection).toBe('row');
    expect(row.style.gap).toBe('12px');
  });

  it('renders the grid layout with the configured column count', () => {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();

    const grid: HTMLElement = fixture.nativeElement.querySelector(
      'dfk-grid-layout > div'
    );
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(grid.style.gap).toBe('12px');
  });
});
```

- [ ] **Step 2: Run the layout tests**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- layout`
Expected: 7 passed.

Note: importing `src/layout/defaultLayouts.ts` runs its module-level
`layoutRegistry.register('column' | 'row' | 'grid', ...)` side effects against
the shared `layoutRegistry`. The registry tests above use `new LayoutRegistry()`
precisely so those side effects cannot make them flaky.

- [ ] **Step 3: Write the public API tests**

Create `packages/angular/test/publicApi.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldRegistry, fieldRegistry } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';
import * as publicApi from '../src/public-api';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { DynamicFieldKitModule } from '../src/lib/dynamic-field-kit.module';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

describe('public API', () => {
  it('exports the components, registry and validation helpers', () => {
    expect(publicApi.DynamicInput).toBeDefined();
    expect(publicApi.FieldInput).toBeDefined();
    expect(publicApi.MultiFieldInput).toBeDefined();
    expect(publicApi.FIELD_REGISTRY).toBe(FIELD_REGISTRY);
    expect(publicApi.FieldRegistry).toBe(FieldRegistry);
    expect(typeof publicApi.validateField).toBe('function');
    expect(typeof publicApi.validateFields).toBe('function');
    expect(typeof publicApi.resolveDisabled).toBe('function');
    expect(typeof publicApi.resolveReadOnly).toBe('function');
  });
});

describe('FIELD_REGISTRY token', () => {
  it('defaults to the process-wide singleton', () => {
    TestBed.configureTestingModule({});

    expect(TestBed.inject(FIELD_REGISTRY)).toBe(fieldRegistry);
  });

  it('can be overridden with a scoped registry', () => {
    const scoped = makeRegistry();
    TestBed.configureTestingModule({
      providers: [{ provide: FIELD_REGISTRY, useValue: scoped }],
    });

    expect(TestBed.inject(FIELD_REGISTRY)).toBe(scoped);
    expect(TestBed.inject(FIELD_REGISTRY)).not.toBe(fieldRegistry);
  });
});

describe('DynamicFieldKitModule', () => {
  @Component({
    standalone: true,
    imports: [DynamicFieldKitModule],
    template: `<dfk-field-input
      [fieldDescription]="{ name: 'a', type: 'text' }"
    ></dfk-field-input>`,
  })
  class ModuleHost {}

  it('exports the components for template use', () => {
    const scoped = makeRegistry();
    scoped.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      providers: [{ provide: FIELD_REGISTRY, useValue: scoped }],
    });

    const fixture = TestBed.createComponent(ModuleHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input.txt')).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run the public API tests**

Run: `npm run test --workspace=@dynamic-field-kit/angular -- publicApi`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/angular/test/layout.spec.ts packages/angular/test/publicApi.spec.ts
git commit -m "test(angular): cover layouts, FIELD_REGISTRY token, module and public API"
```

---

### Task 8: Wire CI and verify everything

**Files:**

- Modify: `.github/workflows/ci.yml:59-79`

**Interfaces:**

- Consumes: the `test` script from Task 1.

- [ ] **Step 1: Update the angular matrix entry**

In `.github/workflows/ci.yml`, the angular entry currently reads:

```yaml
- package: angular
  build-cmd: npm run build --workspace=@dynamic-field-kit/core
  test-cmd: npm run test:coverage --workspace=@dynamic-field-kit/angular
  coverage-file: packages/angular/coverage/lcov.info
  coverage-name: angular
  needs-chrome: true
```

Replace it with:

```yaml
- package: angular
  build-cmd: npm run build --workspace=@dynamic-field-kit/core
  test-cmd: npm run test --workspace=@dynamic-field-kit/angular -- --coverage
  coverage-file: packages/angular/coverage/lcov.info
  coverage-name: angular
```

- [ ] **Step 2: Delete the Chrome install step**

Remove this step entirely — no matrix entry sets `needs-chrome` any more:

```yaml
- name: Install Chrome
  if: matrix.needs-chrome == true
  uses: browser-actions/setup-chrome@latest
  with:
    chrome-version: stable
```

- [ ] **Step 3: Confirm no `needs-chrome` references remain**

Run: `grep -rn "needs-chrome\|setup-chrome\|karma\|jasmine" .github/workflows/ci.yml packages/angular/package.json`
Expected: no output.

- [ ] **Step 4: Run the full Angular suite with coverage, as CI will**

```bash
npm run build --workspace=@dynamic-field-kit/core
npm run test --workspace=@dynamic-field-kit/angular -- --coverage
```

Expected: all tests pass and the coverage summary shows real percentages for `src/`, not `Unknown% (0/0)`. Confirm `packages/angular/coverage/lcov.info` exists and is non-empty.

- [ ] **Step 5: Build all four packages**

```bash
npm run build --workspace=@dynamic-field-kit/core
npm run build --workspace=@dynamic-field-kit/react
npm run build --workspace=@dynamic-field-kit/vue
npm run build --workspace=@dynamic-field-kit/angular
```

Expected: all four exit 0. The Angular build must still succeed after the `isComponentType` change.

- [ ] **Step 6: Lint and format-check**

```bash
npx prettier --write "packages/angular/**/*.{ts,json}" "docs/superpowers/**/*.md"
npm run lint
npm run format-check
```

Expected: lint exits 0; format-check reports "All matched files use Prettier code style!".

- [ ] **Step 7: Run every package's tests**

```bash
(cd packages/core && npx vitest run)
(cd packages/react && npx vitest run)
(cd packages/vue && npx vitest run)
npm run test --workspace=@dynamic-field-kit/angular
```

Expected: core 55 passed, react 59 passed, vue 58 passed, angular all passed. The Angular count is far below the old 36 — that is the intended outcome.

- [ ] **Step 8: Run the verify scripts from the repo root**

```bash
node scripts/verify-framework-deps.js
node scripts/check-cross-framework-imports.js
node scripts/integration-cross-registry.js
```

Expected: each prints its OK/passed message and exits 0. Run from the repo root — these resolve paths relative to the current directory.

- [ ] **Step 9: Commit**

```bash
git add .github/workflows/ci.yml
git add -A
git commit -m "ci(angular): drop Chrome, run vitest with coverage

jsdom needs no browser, so angular stops being the one matrix entry that
installs Chrome. test-cmd now matches react and vue, and coverage reports
real numbers instead of Unknown% (0/0) — karma-coverage had nothing to
instrument because no spec imported the source."
```

---

### Task 9: Update the test backlog memory

**Files:** none in the repo (memory only).

- [ ] **Step 1: Update the memory file**

`C:\Users\vance\.claude\projects\C--Git-dynamic-field-kit\memory\project_test_improvement_backlog.md` lists this work as items 1 and 2 and records the now-disproven diagnosis that karma "cannot import the CommonJS `@dynamic-field-kit/core`". Update it:

- Mark items 1 and 2 done, with the date and the branch name.
- Correct the root cause: karma-typescript could not bundle **any** import; core's format was never the problem.
- Keep items 3-6 as the remaining backlog.
- Item 4 (vue `test` script watch-mode) is untouched by this cycle and stays open.

Also update `C:\Users\vance\.claude\projects\C--Git-dynamic-field-kit\memory\project_ci_gates_and_test_gotchas.md`: the Angular gate is now `npm run test --workspace=@dynamic-field-kit/angular` (vitest, no Chrome), and Gotcha 1 (vue watch mode) still stands.

---

## Notes for the implementer

- Angular 19's `fixture.componentRef.setInput(name, value)` triggers `ngOnChanges` properly; plain property assignment does not. Always use `setInput` for `@Input()`s, then `fixture.detectChanges()`.
- `MultiFieldInput` is `OnPush` and imports itself for recursive group rendering. If a group assertion sees stale DOM, call `fixture.detectChanges()` again after the click rather than reaching for `fixture.autoDetectChanges()`.
- The registry is provided per test via `FIELD_REGISTRY`. Never touch the module-level `fieldRegistry` singleton in a spec except in `publicApi.spec.ts`, which asserts the token defaults to it.
- `registry.register('text', X as never)` is the cast used throughout: `FieldRegistry.register` is typed for function renderers, and Angular component classes are passed through it by design (the README uses `as any`).
- If a test is hard to write, that is a signal about the code, not a reason to weaken the test. Never assert a tautology — the suite this replaces was 36 of them.

## Corrections (post-implementation)

- `tsconfig.spec.json` must NOT be deleted, contrary to what this plan says: `@analogjs/vite-plugin-angular` resolves it for the test compile, and without it every spec file fails to compile with "No test suite found". It was kept and aligned to `target: ES2022` + `useDefineForClassFields: true` to match the shipped fesm2022 emit.
- `@angular-devkit/build-angular` is an OPTIONAL peer of the analog plugin, not a required install as the plan implies; it auto-installs regardless, and removing it does not help.
- The destroy test specified in Task 4 could not fail (Angular's own teardown removes the DOM listener, so the assertion passed whether or not `DynamicInput` unsubscribed). It was rewritten to emit directly on the renderer instance.
- Test counts in the plan are wrong (Task 5 Step 2 says 12 but its code block has 11 `it()` blocks; Task 8 predicts the Angular count drops "far below 36"). Final real state: **43 tests across 6 files**, above the old 36.
- Scope was extended with the owner's approval beyond the plan's "only `isComponentType` may change": `applyProps` (and its `supplied` gate) in `DynamicInput.ts` were also fixed, after the first mounted test proved a second production bug.
