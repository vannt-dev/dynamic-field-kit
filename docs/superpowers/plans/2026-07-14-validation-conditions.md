# Validation & Dynamic Conditions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in, app-supplied field validation and dynamic disabled/readOnly conditions to dynamic-field-kit, surfaced reactively to renderers, with no rule library or form state in the framework-agnostic core.

**Architecture:** Core gains three optional `FieldDescription` hooks (`validate`, `disabledCondition`, `readOnlyCondition`), two `FieldRendererProps` fields (`error`, `readOnly`), and a pure `validation.ts` module (`validateField`, `validateFields`, `resolveDisabled`, `resolveReadOnly`). Each adapter's `MultiFieldInput`/`FieldInput` computes per-leaf-field `error`/`disabled`/`readOnly` from those helpers (skipping hidden and disabled fields) and forwards them to renderers, and each `MultiFieldInput` emits an `onValidityChange`/`validityChange` event carrying the recursive `validateFields` result.

**Tech Stack:** TypeScript monorepo (npm workspaces). Core + React (tsup, vitest, @testing-library/react), Vue 3 (tsup, vitest, @vue/test-utils), Angular (ng-packagr, karma/jasmine).

## Global Constraints

- Every addition is optional and backward compatible: a schema declaring none of the new hooks, and a form with no validity handler, behaves exactly as before.
- Core ships no validation rule logic and no form state (no touched/submitted tracking). The app writes each `validate`/condition function.
- Validation is synchronous in this cycle (no async `validate`).
- A field is skipped (no error, never invalid) when hidden by `appearCondition` OR disabled (`resolveDisabled` true). `readOnly` fields are still validated.
- Group error paths are keyed `` `${name}[${index}].${childName}` `` (e.g. `contacts[0].email`).
- Callback signatures identical across adapters use the `ValidationResult` shape `{ valid: boolean; errors: Record<string, string[]> }`.
- CI gates that must stay green: build all four packages (`npm run build --workspace=@dynamic-field-kit/<pkg>`), `npm run lint`, `npm run format-check`, per-package tests, and the three verify scripts. Vue tests run with `npx vitest run` (its `npm test` is watch-mode). Build core before adapters typecheck against its `dist`.

## File Structure

- `packages/core/src/types.ts` — add hooks to `FieldDescription`; add `error`/`readOnly` to `FieldRendererProps`. (modify)
- `packages/core/src/validation.ts` — new pure module: `ValidationResult`, `validateField`, `validateFields`, `resolveDisabled`, `resolveReadOnly`. (create)
- `packages/core/src/index.ts` — re-export `./validation`. (modify)
- `packages/core/test/validation.test.ts` — unit tests. (create)
- `packages/react/src/components/DynamicInput.tsx` — forward `error`/`readOnly`. (modify)
- `packages/react/src/components/FieldInput.tsx` — compute effective `disabled`/`readOnly`/`error`. (modify)
- `packages/react/src/components/MultiFieldInput.tsx` — `onValidityChange` prop + emit. (modify)
- `packages/react/src/index.ts` — re-export validation helpers. (modify)
- `packages/react/test/validation.test.tsx` — adapter tests. (create)
- `packages/vue/src/components/DynamicInput.ts` — forward `error`/`readOnly`. (modify)
- `packages/vue/src/components/FieldInput.ts` — `rootData` prop + compute. (modify)
- `packages/vue/src/components/MultiFieldInput.ts` — pass `rootData` to leaf; `onValidityChange` prop + emit. (modify)
- `packages/vue/src/index.ts` — re-export validation helpers. (modify)
- `packages/vue/test/validation.test.ts` — adapter tests. (create)
- `packages/angular/src/components/BaseInput.ts` — add `error`/`readOnly` inputs. (modify)
- `packages/angular/src/components/DynamicInput.ts` — add `error`/`readOnly` to `KNOWN_PROPS` + fallback props. (modify)
- `packages/angular/src/components/FieldInput.ts` — accept/forward `error`/`disabled`/`readOnly`. (modify)
- `packages/angular/src/components/MultiFieldInput.ts` — `getError`/`getDisabled`/`getReadOnly` + `validityChange` output. (modify)
- `packages/angular/src/public-api.ts` — re-export validation helpers. (modify)
- `packages/angular/test/validation.spec.ts` — adapter tests. (create)
- `README.md` + `packages/*/README.md` — "Validation & conditions" docs. (modify)

---

### Task 1: Core schema + renderer contract additions

**Files:**

- Modify: `packages/core/src/types.ts`
- Test: `packages/core/test/types.test.ts` (append)

**Interfaces:**

- Produces: `FieldDescription.validate?: (value: unknown, data: Properties, rootData?: Properties) => string | string[] | undefined`; `FieldDescription.disabledCondition?: (data: Properties, rootData?: Properties) => boolean`; `FieldDescription.readOnlyCondition?: (data: Properties, rootData?: Properties) => boolean`; `FieldRendererProps.error?: string | string[]`; `FieldRendererProps.readOnly?: boolean`.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/test/types.test.ts`:

```ts
describe('validation & condition hooks', () => {
  test('FieldDescription accepts validate, disabledCondition, readOnlyCondition', () => {
    const field: FieldDescription = {
      name: 'email',
      type: 'text',
      validate: (value, data, rootData) =>
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

  test('FieldRendererProps accepts error and readOnly', () => {
    const props: FieldRendererProps = {
      value: '',
      error: ['Required'],
      readOnly: true,
    };
    expect(props.error).toEqual(['Required']);
    expect(props.readOnly).toBe(true);
  });
});
```

Note: `types.test.ts` already imports `FieldDescription`, `FieldRendererProps`, and augments `FieldTypeMap` with `text`. If `FieldRendererProps` is not yet imported there, add it to the existing import from `../src`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/types.test.ts`
Expected: FAIL — TypeScript errors that `validate`/`disabledCondition`/`readOnlyCondition`/`error`/`readOnly` do not exist on the types.

- [ ] **Step 3: Add the fields to the interfaces**

In `packages/core/src/types.ts`, in `FieldRendererProps`, after the `disabled?: boolean;` line add:

```ts
  readOnly?: boolean;
  error?: string | string[];
```

In `FieldDescription`, immediately after the `disabled?: boolean;` line add:

```ts
  /**
   * Returns one or more validation error messages for `value`, or a falsy
   * value when it is valid. App-supplied, like appearCondition/computeValue -
   * core ships no rule logic. `rootData` is the top-level form (equal to
   * `data` outside a group).
   */
  validate?: (
    value: unknown,
    data: Properties,
    rootData?: Properties
  ) => string | string[] | undefined;
```

In `FieldDescription`, immediately after the `computeValue?: ...` block add:

```ts
  /** Dynamic disabled state, OR-ed with the static `disabled` flag. */
  disabledCondition?: (data: Properties, rootData?: Properties) => boolean;
  /** Dynamic read-only state. */
  readOnlyCondition?: (data: Properties, rootData?: Properties) => boolean;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/test/types.test.ts
git commit -m "feat(core): add validate/disabledCondition/readOnlyCondition and renderer error/readOnly"
```

---

### Task 2: Core `validateField`, `resolveDisabled`, `resolveReadOnly`

**Files:**

- Create: `packages/core/src/validation.ts`
- Test: `packages/core/test/validation.test.ts`

**Interfaces:**

- Consumes: `FieldDescription`, `Properties` from `./types`.
- Produces: `validateField(field, value, data, rootData?): string[]`; `resolveDisabled(field, data, rootData?): boolean`; `resolveReadOnly(field, data, rootData?): boolean`.

- [ ] **Step 1: Write the failing test**

Create `packages/core/test/validation.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  resolveDisabled,
  resolveReadOnly,
  validateField,
} from '../src/validation';
import type { FieldDescription } from '../src';

declare module '../src' {
  interface FieldTypeMap {
    text: string;
  }
}

describe('validateField', () => {
  const base: FieldDescription = { name: 'email', type: 'text' };

  test('returns [] when there is no validate hook', () => {
    expect(validateField(base, 'x', {})).toEqual([]);
  });

  test('wraps a single string into a one-element array', () => {
    const field: FieldDescription = {
      ...base,
      validate: () => 'Required',
    };
    expect(validateField(field, '', {})).toEqual(['Required']);
  });

  test('passes arrays through and returns [] for falsy results', () => {
    const many: FieldDescription = { ...base, validate: () => ['a', 'b'] };
    const ok: FieldDescription = { ...base, validate: () => undefined };
    expect(validateField(many, '', {})).toEqual(['a', 'b']);
    expect(validateField(ok, '', {})).toEqual([]);
  });

  test('receives value, data and rootData', () => {
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      validate: (value, data, rootData) =>
        `${value}:${data.country}:${rootData?.locale}`,
    };
    expect(
      validateField(field, 'x', { country: 'vn' }, { locale: 'en' })
    ).toEqual(['x:vn:en']);
  });
});

describe('resolveDisabled / resolveReadOnly', () => {
  test('resolveDisabled OR-s the static flag and the condition', () => {
    expect(resolveDisabled({ name: 'a', type: 'text' }, {})).toBe(false);
    expect(
      resolveDisabled({ name: 'a', type: 'text', disabled: true }, {})
    ).toBe(true);
    expect(
      resolveDisabled(
        { name: 'a', type: 'text', disabledCondition: (d) => d.lock === true },
        { lock: true }
      )
    ).toBe(true);
  });

  test('resolveReadOnly reflects the condition', () => {
    expect(resolveReadOnly({ name: 'a', type: 'text' }, {})).toBe(false);
    expect(
      resolveReadOnly(
        {
          name: 'a',
          type: 'text',
          readOnlyCondition: (d) => d.frozen === true,
        },
        { frozen: true }
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/validation.test.ts`
Expected: FAIL — cannot resolve `../src/validation`.

- [ ] **Step 3: Write the implementation**

Create `packages/core/src/validation.ts`:

```ts
import type { FieldDescription, Properties } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/** Effective disabled state: the static flag OR the dynamic condition. */
export function resolveDisabled(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): boolean {
  return (
    field.disabled === true ||
    field.disabledCondition?.(data, rootData) === true
  );
}

/** Effective read-only state from the dynamic condition. */
export function resolveReadOnly(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): boolean {
  return field.readOnlyCondition?.(data, rootData) === true;
}

/** Run one field's validate hook; always returns an array (empty when valid). */
export function validateField(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties
): string[] {
  if (!field.validate) {
    return [];
  }
  const result = field.validate(value, data, rootData);
  if (!result) {
    return [];
  }
  return Array.isArray(result) ? result : [result];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/validation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/validation.ts packages/core/test/validation.test.ts
git commit -m "feat(core): add validateField, resolveDisabled, resolveReadOnly"
```

---

### Task 3: Core `validateFields` (recursive)

**Files:**

- Modify: `packages/core/src/validation.ts`
- Test: `packages/core/test/validation.test.ts` (append)

**Interfaces:**

- Consumes: `validateField`, `resolveDisabled`, `isFieldGroup`.
- Produces: `validateFields(fields, data, rootData?): ValidationResult`; exported `interface ValidationResult { valid: boolean; errors: Record<string, string[]> }`.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/test/validation.test.ts`:

```ts
import { validateFields } from '../src/validation';

describe('validateFields', () => {
  const required = (msg: string) => (v: unknown) => v ? undefined : msg;

  test('collects leaf errors and reports overall validity', () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', validate: required('Name required') },
      { name: 'email', type: 'text' },
    ];
    const result = validateFields(fields, { name: '', email: 'x' });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ name: ['Name required'] });
  });

  test('is valid when everything passes', () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', validate: required('r') },
    ];
    expect(validateFields(fields, { name: 'Ada' })).toEqual({
      valid: true,
      errors: {},
    });
  });

  test('skips fields hidden by appearCondition', () => {
    const fields: FieldDescription[] = [
      {
        name: 'company',
        type: 'text',
        appearCondition: (d) => d.type === 'business',
        validate: required('Company required'),
      },
    ];
    expect(validateFields(fields, { type: 'personal' }).valid).toBe(true);
  });

  test('skips disabled fields but still validates readOnly ones', () => {
    const fields: FieldDescription[] = [
      { name: 'a', type: 'text', disabled: true, validate: required('A') },
      {
        name: 'b',
        type: 'text',
        disabledCondition: () => true,
        validate: required('B'),
      },
      {
        name: 'c',
        type: 'text',
        readOnlyCondition: () => true,
        validate: required('C'),
      },
    ];
    const result = validateFields(fields, { a: '', b: '', c: '' });
    expect(result.errors).toEqual({ c: ['C'] });
  });

  test('descends into groups with indexed path keys and threads rootData', () => {
    const fields: FieldDescription[] = [
      {
        name: 'contacts',
        type: 'text',
        fields: [
          {
            name: 'email',
            type: 'text',
            validate: (v, _d, rootData) =>
              rootData?.strict && !v ? 'Email required' : undefined,
          },
        ],
      },
    ];
    const data = { strict: true, contacts: [{ email: 'a@b' }, { email: '' }] };
    const result = validateFields(fields, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ 'contacts[1].email': ['Email required'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx vitest run test/validation.test.ts`
Expected: FAIL — `validateFields` is not exported.

- [ ] **Step 3: Write the implementation**

At the top of `packages/core/src/validation.ts`, add the group helper import above the existing `import type` line:

```ts
import { isFieldGroup } from './fieldGroup';
```

Then append to the same file:

```ts
/**
 * Recursively validate `fields` against `data`, descending into repeatable
 * groups. Skips fields hidden by `appearCondition` or disabled (see
 * resolveDisabled); readOnly fields are still validated. Group error keys use
 * `${name}[${index}].${childName}`. `rootData` defaults to `data`.
 */
export function validateFields(
  fields: FieldDescription[],
  data: Properties,
  rootData: Properties = data
): ValidationResult {
  const errors: Record<string, string[]> = {};

  for (const field of fields) {
    if (field.appearCondition && !field.appearCondition(data, rootData)) {
      continue;
    }
    if (resolveDisabled(field, data, rootData)) {
      continue;
    }

    if (isFieldGroup(field)) {
      const items = Array.isArray(data[field.name])
        ? (data[field.name] as Properties[])
        : [];
      items.forEach((item, index) => {
        const sub = validateFields(field.fields, item, rootData);
        for (const [key, messages] of Object.entries(sub.errors)) {
          errors[`${field.name}[${index}].${key}`] = messages;
        }
      });
      continue;
    }

    const fieldErrors = validateField(field, data[field.name], data, rootData);
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/core && npx vitest run test/validation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/validation.ts packages/core/test/validation.test.ts
git commit -m "feat(core): add recursive validateFields"
```

---

### Task 4: Export validation from core and rebuild

**Files:**

- Modify: `packages/core/src/index.ts`

**Interfaces:**

- Produces: `@dynamic-field-kit/core` now exports `validateField`, `validateFields`, `resolveDisabled`, `resolveReadOnly`, and type `ValidationResult`.

- [ ] **Step 1: Add the export**

In `packages/core/src/index.ts`, after the `export * from './layout';` line add:

```ts
export * from './validation';
```

- [ ] **Step 2: Build core and run its full test suite**

Run: `cd packages/core && npm run build && npx vitest run`
Expected: build succeeds (DTS included); all tests PASS.

- [ ] **Step 3: Typecheck core**

Run: `cd packages/core && npx tsc -p tsconfig.json --noEmit`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export validation module"
```

---

### Task 5: React adapter wiring

**Files:**

- Modify: `packages/react/src/components/DynamicInput.tsx`
- Modify: `packages/react/src/components/FieldInput.tsx`
- Modify: `packages/react/src/components/MultiFieldInput.tsx`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/test/validation.test.tsx`

**Interfaces:**

- Consumes: `validateField`, `resolveDisabled`, `resolveReadOnly`, `validateFields`, `ValidationResult` from `@dynamic-field-kit/core`.
- Produces: `MultiFieldInput` prop `onValidityChange?: (result: ValidationResult) => void`; renderers receive `error`/`readOnly`.

- [ ] **Step 1: Write the failing test**

Create `packages/react/test/validation.test.tsx`:

```tsx
import type { FieldDescription } from '@dynamic-field-kit/core';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src/fieldRegistry';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

afterEach(() => {
  (fieldRegistry as any).registry = {};
});

function registerTextRenderer() {
  fieldRegistry.register('text', (({
    value,
    onValueChange,
    error,
    disabled,
    readOnly,
  }: any) => (
    <div>
      <input
        data-testid="input"
        disabled={!!disabled}
        readOnly={!!readOnly}
        value={value || ''}
        onChange={(e: any) => onValueChange?.(e.target.value)}
      />
      {error ? (
        <span data-testid="error">{[].concat(error).join(',')}</span>
      ) : null}
    </div>
  )) as any);
}

describe('React validation wiring', () => {
  it('surfaces validate() errors to the renderer', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        validate: (v) => (String(v).includes('@') ? undefined : 'Invalid'),
      },
    ];
    render(
      <MultiFieldInput fieldDescriptions={fields} properties={{ email: 'x' }} />
    );
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid');
  });

  it('does not surface an error for a disabled field', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        disabled: true,
        validate: () => 'Invalid',
      },
    ];
    render(
      <MultiFieldInput fieldDescriptions={fields} properties={{ email: '' }} />
    );
    expect(screen.queryByTestId('error')).toBeNull();
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('applies disabledCondition dynamically and emits onValidityChange', () => {
    registerTextRenderer();
    const onValidity = vi.fn();
    const fields: FieldDescription[] = [
      { name: 'type', type: 'text' },
      {
        name: 'company',
        type: 'text',
        disabledCondition: (d) => d.type !== 'business',
        validate: (v) => (v ? undefined : 'Required'),
      },
    ];
    render(
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={{ type: 'personal', company: '' }}
        onValidityChange={onValidity}
      />
    );
    // company is disabled -> not invalid
    expect(onValidity).toHaveBeenLastCalledWith({ valid: true, errors: {} });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/react && npx vitest run test/validation.test.tsx`
Expected: FAIL — `error` never reaches the renderer; `onValidityChange` prop is ignored.

- [ ] **Step 3: Forward `error`/`readOnly` in `DynamicInput.tsx`**

In `packages/react/src/components/DynamicInput.tsx`, add to the `Props` interface (after `disabled?: boolean;`):

```ts
  readOnly?: boolean;
  error?: string | string[];
```

Add `readOnly` and `error` to the destructured params (after `disabled,`):

```ts
  readOnly,
  error,
```

And add them to the `React.createElement(Renderer, { ... })` props object (after `disabled,`):

```ts
    readOnly,
    error,
```

- [ ] **Step 4: Compute effective props in `FieldInput.tsx`**

In `packages/react/src/components/FieldInput.tsx`, update the core import to include the helpers:

```ts
import {
  resolveDisabled,
  resolveReadOnly,
  validateField,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
```

In the leaf-field branch (the `return (<DynamicInput .../>)` at the end), compute the values just before the `return`:

```ts
const effectiveDisabled = resolveDisabled(
  fieldDescription,
  renderInfos,
  rootData
);
const readOnly = resolveReadOnly(fieldDescription, renderInfos, rootData);
const errors = effectiveDisabled
  ? []
  : validateField(fieldDescription, renderInfos[name], renderInfos, rootData);
const error = errors.length > 0 ? errors : undefined;
```

Then change the `<DynamicInput>` element to pass them (replace the existing `disabled={disabled}` and add two props):

```tsx
<DynamicInput
  type={type}
  label={label}
  value={renderInfos[name]}
  options={options}
  className={className}
  description={description as React.ReactNode}
  disabled={effectiveDisabled}
  readOnly={readOnly}
  error={error}
  extraProps={props}
  onChange={handleChange}
/>
```

Note: the destructured `disabled` from `fieldDescription` is now unused; remove `disabled,` from the `const { ... } = fieldDescription;` destructure to satisfy lint.

- [ ] **Step 5: Add `onValidityChange` to `MultiFieldInput.tsx`**

In `packages/react/src/components/MultiFieldInput.tsx`, add to the core import:

```ts
import {
  applyComputedValues,
  validateFields,
  FieldDescription,
  Properties,
  type ValidationResult,
} from '@dynamic-field-kit/core';
```

Add to `Props`:

```ts
  onValidityChange?: (result: ValidationResult) => void;
```

Destructure it in the component params (after `rootData,`): `onValidityChange,`.

After the existing `rootDataRef` block, add a ref and an emit effect:

```ts
const onValidityChangeRef = useRef(onValidityChange);
onValidityChangeRef.current = onValidityChange;

useEffect(() => {
  onValidityChangeRef.current?.(
    validateFields(fieldDescriptions, data, rootData)
  );
}, [data, fieldDescriptions, rootData]);
```

- [ ] **Step 6: Re-export helpers from `index.ts`**

In `packages/react/src/index.ts`, add after the existing core re-export block:

```ts
export {
  validateField,
  validateFields,
  resolveDisabled,
  resolveReadOnly,
  type ValidationResult,
} from '@dynamic-field-kit/core';
```

- [ ] **Step 7: Run the new test and the full React suite**

Run: `cd packages/react && npx vitest run`
Expected: PASS (new `validation.test.tsx` plus all existing tests).

- [ ] **Step 8: Commit**

```bash
git add packages/react/src packages/react/test/validation.test.tsx
git commit -m "feat(react): surface validation errors and dynamic disabled/readOnly; onValidityChange"
```

---

### Task 6: Vue adapter wiring

**Files:**

- Modify: `packages/vue/src/components/DynamicInput.ts`
- Modify: `packages/vue/src/components/FieldInput.ts`
- Modify: `packages/vue/src/components/MultiFieldInput.ts`
- Modify: `packages/vue/src/index.ts`
- Test: `packages/vue/test/validation.test.ts`

**Interfaces:**

- Consumes: `validateField`, `resolveDisabled`, `resolveReadOnly`, `validateFields`, `ValidationResult` from `@dynamic-field-kit/core`.
- Produces: `MultiFieldInput` prop `onValidityChange?: (result: ValidationResult) => void`; leaf `FieldInput` now takes a `rootData` prop; renderers receive `error`/`readOnly`.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/validation.test.ts`:

```ts
import type { FieldDescription } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { fieldRegistry } from '../src';
import '../src/layout/defaultLayouts';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
  }
}

afterEach(() => {
  (fieldRegistry as any).registry = {};
});

function registerTextRenderer() {
  (fieldRegistry as any).registry['text'] = {
    props: ['value', 'error', 'disabled', 'readOnly'],
    emits: ['update:value'],
    setup(props: any) {
      return () =>
        h('div', [
          h('input', {
            'data-testid': 'input',
            disabled: !!props.disabled,
            value: props.value ?? '',
          }),
          props.error
            ? h(
                'span',
                { class: 'error' },
                ([] as string[]).concat(props.error).join(',')
              )
            : null,
        ]);
    },
  };
}

describe('Vue validation wiring', () => {
  it('surfaces validate() errors to the renderer', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        validate: (v) => (String(v).includes('@') ? undefined : 'Invalid'),
      },
    ];
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, properties: { email: 'x' } },
    });
    expect(wrapper.find('.error').text()).toBe('Invalid');
  });

  it('does not surface an error for a disabled field', () => {
    registerTextRenderer();
    const fields: FieldDescription[] = [
      {
        name: 'email',
        type: 'text',
        disabled: true,
        validate: () => 'Invalid',
      },
    ];
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, properties: { email: '' } },
    });
    expect(wrapper.find('.error').exists()).toBe(false);
  });

  it('emits onValidityChange with the recursive result', () => {
    registerTextRenderer();
    const onValidityChange = vi.fn();
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        validate: (v) => (v ? undefined : 'Required'),
      },
    ];
    mount(MultiFieldInput, {
      props: {
        fieldDescriptions: fields,
        properties: { name: '' },
        onValidityChange,
      },
    });
    expect(onValidityChange).toHaveBeenLastCalledWith({
      valid: false,
      errors: { name: ['Required'] },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/vue && npx vitest run test/validation.test.ts`
Expected: FAIL — no `error` prop reaches the renderer; `onValidityChange` not emitted.

- [ ] **Step 3: Forward `error`/`readOnly` in `DynamicInput.ts`**

In `packages/vue/src/components/DynamicInput.ts`, add two props to the `props` object (after the `disabled` prop):

```ts
    readOnly: {
      type: Boolean,
      default: undefined,
    },
    error: {
      type: [String, Array] as PropType<string | string[]>,
      default: undefined,
    },
```

In the `h(Renderer.value, { ... })` call, add (after `disabled: props.disabled,`):

```ts
        readOnly: props.readOnly,
        error: props.error,
```

- [ ] **Step 4: Add `rootData` + computed props in `FieldInput.ts`**

Rewrite `packages/vue/src/components/FieldInput.ts` to:

```ts
import {
  resolveDisabled,
  resolveReadOnly,
  validateField,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import { defineComponent, h, PropType } from 'vue';
import DynamicInput from './DynamicInput';

const FieldInput = defineComponent({
  name: 'FieldInput',
  props: {
    fieldDescription: {
      type: Object as PropType<FieldDescription>,
      required: true,
    },
    renderInfos: {
      type: Object as PropType<Properties>,
      required: true,
    },
    rootData: {
      type: Object as PropType<Properties>,
      default: undefined,
    },
    onValueChangeField: {
      type: Function as PropType<(value: unknown, key: string) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const {
        name,
        type,
        label,
        options,
        className,
        description,
        props: extraProps,
      } = props.fieldDescription;

      const disabled = resolveDisabled(
        props.fieldDescription,
        props.renderInfos,
        props.rootData
      );
      const readOnly = resolveReadOnly(
        props.fieldDescription,
        props.renderInfos,
        props.rootData
      );
      const errors = disabled
        ? []
        : validateField(
            props.fieldDescription,
            props.renderInfos[name],
            props.renderInfos,
            props.rootData
          );

      return h(DynamicInput, {
        type,
        label,
        value: props.renderInfos[name],
        options,
        className,
        description,
        disabled,
        readOnly,
        error: errors.length > 0 ? errors : undefined,
        extraProps,
        onChange: (v: unknown) => props.onValueChangeField(v, name),
      });
    };
  },
});

export default FieldInput;
```

- [ ] **Step 5: Pass `rootData` to leaf `FieldInput` and emit validity in `MultiFieldInput.ts`**

In `packages/vue/src/components/MultiFieldInput.ts`, add to the core import (alongside the existing named imports):

```ts
  validateFields,
```

and add a type import near the top-level imports:

```ts
import type { ValidationResult } from '@dynamic-field-kit/core';
```

Add an `onValidityChange` prop to the `props` object (after `rootData`):

```ts
    onValidityChange: {
      type: Function as PropType<(result: ValidationResult) => void>,
      default: undefined,
    },
```

In the leaf `h(FieldInput, { ... })` call inside the render function, add `rootData`:

```ts
              rootData: props.rootData ?? data,
```

Inside `setup`, after the existing `watch(() => props.properties, ...)` block, add a validity watch:

```ts
watch(
  () => [props.fieldDescriptions, { ...data }] as const,
  () => {
    props.onValidityChange?.(
      validateFields(props.fieldDescriptions, { ...data }, props.rootData)
    );
  },
  { immediate: true, deep: true }
);
```

- [ ] **Step 6: Re-export helpers from `index.ts`**

In `packages/vue/src/index.ts`, add to the core re-export block (with the other `export { ... } from '@dynamic-field-kit/core'`):

```ts
export {
  validateField,
  validateFields,
  resolveDisabled,
  resolveReadOnly,
  type ValidationResult,
} from '@dynamic-field-kit/core';
```

- [ ] **Step 7: Run the new test and the full Vue suite**

Run: `cd packages/vue && npx vitest run`
Expected: PASS (new `validation.test.ts` plus all existing tests).

- [ ] **Step 8: Commit**

```bash
git add packages/vue/src packages/vue/test/validation.test.ts
git commit -m "feat(vue): surface validation errors and dynamic disabled/readOnly; onValidityChange"
```

---

### Task 7: Angular adapter wiring

**Files:**

- Modify: `packages/angular/src/components/BaseInput.ts`
- Modify: `packages/angular/src/components/DynamicInput.ts`
- Modify: `packages/angular/src/components/FieldInput.ts`
- Modify: `packages/angular/src/components/MultiFieldInput.ts`
- Modify: `packages/angular/src/public-api.ts`
- Test: `packages/angular/test/validation.spec.ts`

**Interfaces:**

- Consumes: `validateField`, `resolveDisabled`, `resolveReadOnly`, `validateFields`, `ValidationResult` from `@dynamic-field-kit/core`.
- Produces: `MultiFieldInput` output `@Output() validityChange = new EventEmitter<ValidationResult>()`; `FieldInput` inputs `error`/`disabled`/`readOnly`; renderers receive `error`/`readOnly`.

- [ ] **Step 1: Write the failing test**

Create `packages/angular/test/validation.spec.ts`:

```ts
import { validateFields, resolveDisabled } from '@dynamic-field-kit/core';
import type { FieldDescription } from '@dynamic-field-kit/core';

describe('Angular validation helpers (via core)', () => {
  it('validateFields skips disabled fields', () => {
    const fields: FieldDescription[] = [
      { name: 'a', type: 'text' as any, disabled: true, validate: () => 'A' },
      {
        name: 'b',
        type: 'text' as any,
        validate: (v: unknown) => (v ? undefined : 'B'),
      },
    ];
    const result = validateFields(fields, { a: '', b: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ b: ['B'] });
  });

  it('resolveDisabled OR-s static flag and condition', () => {
    const field: FieldDescription = {
      name: 'x',
      type: 'text' as any,
      disabledCondition: (d: any) => d.lock === true,
    };
    expect(resolveDisabled(field, { lock: false })).toBe(false);
    expect(resolveDisabled(field, { lock: true })).toBe(true);
  });
});
```

(Angular's existing specs are logic-level; this mirrors that style and exercises the wiring's core dependency. The component wiring below is covered by build-time template type-checking plus the shared core tests.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/angular && npm test`
Expected: FAIL — core validation helpers not yet exported to the Angular test build (until core is rebuilt) OR assertion mismatch. If core `dist` is current from Task 4, this test passes on its own; still run it to confirm the harness picks up the new spec, then proceed to wire the components.

- [ ] **Step 3: Add `error`/`readOnly` inputs to `BaseInput.ts`**

In `packages/angular/src/components/BaseInput.ts`, add to `FieldInputProps` (after `description?: string;`):

```ts
  readOnly?: boolean;
  error?: string | string[];
```

Add to `BaseInputComponent` (after `@Input() description?: string;`):

```ts
  @Input() readOnly?: boolean;
  @Input() error?: string | string[];
```

- [ ] **Step 4: Forward the new props in `DynamicInput.ts`**

In `packages/angular/src/components/DynamicInput.ts`, add `'readOnly'` and `'error'` to the `KNOWN_PROPS` array (after `'description',`):

```ts
  'readOnly',
  'error',
```

In `getFallbackProps()`, add two entries (after `description: this.description ?? '',`):

```ts
      readOnly: this.readOnly ?? false,
      error: this.error,
```

- [ ] **Step 5: Accept and forward `error`/`disabled`/`readOnly` in `FieldInput.ts`**

Rewrite `packages/angular/src/components/FieldInput.ts` to add the inputs and bind them:

```ts
import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FieldDescription } from '@dynamic-field-kit/core';
import { DynamicInput } from './DynamicInput';

@Component({
  selector: 'dfk-field-input',
  standalone: true,
  imports: [NgIf, DynamicInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dfk-dynamic-input
      *ngIf="shouldRender"
      [type]="fieldDescription!.type"
      [value]="value"
      [label]="fieldDescription!.label"
      [placeholder]="fieldDescription!.placeholder"
      [required]="fieldDescription!.required"
      [description]="$any(fieldDescription!.description)"
      [options]="fieldDescription!.options"
      [className]="fieldDescription!.className"
      (valueChange)="
        onValueChangeField.emit({ value: $event, key: fieldDescription!.name })
      "
      [disabled]="disabled"
      [readOnly]="readOnly"
      [error]="$any(error)"
      [extraProps]="fieldDescription!.props"
    ></dfk-dynamic-input>
  `,
})
export class FieldInput implements OnChanges {
  @Input() fieldDescription?: FieldDescription;
  @Input() value?: unknown;
  @Input() disabled?: boolean;
  @Input() readOnly?: boolean;
  @Input() error?: string | string[];
  @Output() onValueChangeField = new EventEmitter<{
    value: unknown;
    key: string;
  }>();

  shouldRender = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(_changes: SimpleChanges): void {
    this.shouldRender = !!this.fieldDescription;
    this.cdr.markForCheck();
  }
}
```

- [ ] **Step 6: Compute per-field values and emit validity in `MultiFieldInput.ts`**

In `packages/angular/src/components/MultiFieldInput.ts`, add to the core import:

```ts
  resolveDisabled,
  resolveReadOnly,
  validateField,
  validateFields,
```

and add a type import:

```ts
import type { ValidationResult } from '@dynamic-field-kit/core';
```

In the leaf `<dfk-field-input>` element in the template, add three bindings (after `[value]="data[field.name]"`):

```html
[disabled]="getDisabled(field)" [readOnly]="getReadOnly(field)"
[error]="getError(field)"
```

Add the output near the other `@Output()`s:

```ts
  @Output() validityChange = new EventEmitter<ValidationResult>();
```

Add the helper methods (near `getItems`):

```ts
  getDisabled(field: FieldDescription): boolean {
    return resolveDisabled(field, this.data, this.rootData);
  }

  getReadOnly(field: FieldDescription): boolean {
    return resolveReadOnly(field, this.data, this.rootData);
  }

  getError(field: FieldDescription): string[] | undefined {
    if (this.getDisabled(field)) {
      return undefined;
    }
    const errors = validateField(
      field,
      this.data[field.name],
      this.data,
      this.rootData
    );
    return errors.length > 0 ? errors : undefined;
  }
```

In `commitData(nextData)`, after `this.updateVisibleFields();`, add:

```ts
this.validityChange.emit(
  validateFields(this.fieldDescriptions, this.data, this.rootData)
);
```

In `init()`, after `this.updateVisibleFields();`, add:

```ts
this.validityChange.emit(
  validateFields(this.fieldDescriptions, this.data, this.rootData)
);
```

- [ ] **Step 7: Re-export helpers from `public-api.ts`**

In `packages/angular/src/public-api.ts`, after the `export { fieldRegistry, FieldRegistry } from '@dynamic-field-kit/core';` line add:

```ts
export {
  validateField,
  validateFields,
  resolveDisabled,
  resolveReadOnly,
} from '@dynamic-field-kit/core';
export type { ValidationResult } from '@dynamic-field-kit/core';
```

- [ ] **Step 8: Rebuild core, build Angular, run Angular tests**

Run: `cd packages/core && npm run build && cd ../angular && npm run build && npm test`
Expected: core build OK; Angular package build OK (template type-check passes); all Angular tests PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/angular/src packages/angular/test/validation.spec.ts
git commit -m "feat(angular): surface validation errors and dynamic disabled/readOnly; validityChange"
```

---

### Task 8: Documentation

**Files:**

- Modify: `README.md`
- Modify: `packages/core/README.md`
- Modify: `packages/react/README.md`
- Modify: `packages/vue/README.md`
- Modify: `packages/angular/README.md`

**Interfaces:**

- Consumes: nothing (docs only).

- [ ] **Step 1: Root README — add a "Validation & conditions" section**

In `README.md`, after the "Repeatable Field Groups" block (before the "Field Registry (Render Layer)" block), add:

````markdown
**Validation & conditions**

Fields can declare an app-supplied `validate` hook plus dynamic
`disabledCondition` / `readOnlyCondition`. The library ships no rule logic and
holds no form state: it runs your functions and surfaces the result. _When_ to
display an error is the renderer's/app's decision.

| Property          | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| validate          | `(value, data, rootData?) => string \| string[] \| undefined`. Falsy means valid. |
| disabledCondition | `(data, rootData?) => boolean`. OR-ed with the static `disabled` flag.            |
| readOnlyCondition | `(data, rootData?) => boolean`.                                                   |

`MultiFieldInput` passes each field's current `error` and effective
`disabled`/`readOnly` to its renderer (via `FieldRendererProps`), and emits an
`onValidityChange` (`validityChange` in Angular) event with
`{ valid, errors }` on every change. Disabled and hidden (`appearCondition`)
fields are skipped - they never produce errors. For submit-time validation of a
whole form (including group items) call the exported pure function:

```ts
import { validateFields } from '@dynamic-field-kit/core';

const { valid, errors } = validateFields(fields, data);
// errors: { "email": ["Invalid"], "contacts[1].email": ["Required"] }
```
````

````

- [ ] **Step 2: Core README — document the hooks and helpers**

In `packages/core/README.md`, in the "What this package provides" list, add after the `applyComputedValues` bullet:

```markdown
- `validateField`, `validateFields`, `resolveDisabled`, `resolveReadOnly` and the `ValidationResult` type for opt-in, app-supplied validation and dynamic disabled/readOnly conditions
````

Add a new section before "## Repeatable field groups":

````markdown
## Validation & conditions

`validate`, `disabledCondition`, and `readOnlyCondition` are app-supplied hooks
on `FieldDescription` (the library ships no rule logic and no form state).

```ts
const fields: FieldDescription[] = [
  {
    name: 'email',
    type: 'text',
    validate: (value) =>
      String(value).includes('@') ? undefined : 'Invalid email',
    readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
  },
];
```

`validateFields(fields, data, rootData?)` returns `{ valid, errors }`, recursing
into repeatable groups (keys like `contacts[0].email`) and skipping fields that
are hidden by `appearCondition` or disabled. Adapters call `validateField` /
`resolveDisabled` / `resolveReadOnly` per field to surface `error`,
`disabled`, and `readOnly` to renderers reactively; display timing is the
renderer's/app's concern.
````

- [ ] **Step 3: React README — add validation usage + exports**

In `packages/react/README.md`, in the "Exports" list add:

```markdown
- `validateField` / `validateFields` / `resolveDisabled` / `resolveReadOnly` / `ValidationResult`
```

Add a section after "## Derived fields with `computeValue`":

````markdown
## Validation & conditions

Declare a `validate` hook and dynamic `disabledCondition`/`readOnlyCondition`;
your renderer receives `error`, `disabled`, and `readOnly`. `MultiFieldInput`
emits `onValidityChange`:

```tsx
<MultiFieldInput
  fieldDescriptions={fields}
  properties={data}
  onChange={setData}
  onValidityChange={({ valid, errors }) => setCanSubmit(valid)}
/>
```

Read the props inside a renderer:

```tsx
fieldRegistry.register('text', ({ value, onValueChange, error, disabled }) => (
  <label>
    <input
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
    {error && <span className="error">{[].concat(error).join(', ')}</span>}
  </label>
));
```
````

- [ ] **Step 4: Vue README — add validation usage + exports**

In `packages/vue/README.md`, in the "Exports" list add:

```markdown
- `validateField` / `validateFields` / `resolveDisabled` / `resolveReadOnly` / `ValidationResult`
```

Add a section after "## Derived fields with `computeValue`":

````markdown
## Validation & conditions

Declare a `validate` hook and dynamic `disabledCondition`/`readOnlyCondition`;
your renderer receives `error`, `disabled`, and `readOnly`, and `MultiFieldInput`
emits `onValidityChange`:

```vue
<MultiFieldInput
  :fieldDescriptions="fields"
  :properties="formData"
  :onChange="handleChange"
  :onValidityChange="({ valid }) => (canSubmit = valid)"
/>
```

A renderer reads the props (`error`, `disabled`, `readOnly`) it declares, the
same way it reads `value`/`label`.
````

- [ ] **Step 5: Angular README — add validation usage + exports**

In `packages/angular/README.md`, in the "What it exports" list add:

```markdown
- `validateField` / `validateFields` / `resolveDisabled` / `resolveReadOnly` / `ValidationResult`
```

Add a section after "## Derived fields with `computeValue`":

````markdown
## Validation & conditions

Declare a `validate` hook and dynamic `disabledCondition`/`readOnlyCondition`;
your renderer component receives `error`, `disabled`, and `readOnly` inputs, and
`dfk-multi-field-input` emits `(validityChange)`:

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [properties]="data"
  (onChange)="onChange($event)"
  (validityChange)="canSubmit = $event.valid"
></dfk-multi-field-input>
```

For submit-time whole-form validation, call `validateFields(fields, data)`.
````

- [ ] **Step 6: Format-check the docs**

Run: `npx prettier --write "README.md" "packages/*/README.md" && npm run format-check`
Expected: `format-check` reports "All matched files use Prettier code style!".

- [ ] **Step 7: Commit**

```bash
git add README.md packages/core/README.md packages/react/README.md packages/vue/README.md packages/angular/README.md
git commit -m "docs: document validation & dynamic conditions"
```

---

### Task 9: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Build all four packages**

Run:

```bash
npm run build --workspace=@dynamic-field-kit/core
npm run build --workspace=@dynamic-field-kit/react
npm run build --workspace=@dynamic-field-kit/vue
npm run build --workspace=@dynamic-field-kit/angular
```

Expected: all four build successfully (DTS / Ivy included).

- [ ] **Step 2: Lint and format-check**

Run: `npm run lint && npm run format-check`
Expected: lint exits 0; format-check reports all files styled.

- [ ] **Step 3: Run every package's tests**

Run:

```bash
(cd packages/core && npx vitest run)
(cd packages/react && npx vitest run)
(cd packages/vue && npx vitest run)
(cd packages/angular && npm test)
```

Expected: all suites PASS.

- [ ] **Step 4: Run the verify scripts**

Run:

```bash
node scripts/verify-framework-deps.js
node scripts/check-cross-framework-imports.js
node scripts/integration-cross-registry.js
```

Expected: each prints its OK/passed message and exits 0.

- [ ] **Step 5: Final commit (if any formatting/lint fixes were needed)**

```bash
git add -A
git commit -m "chore: validation & conditions verification fixes" || echo "nothing to commit"
```

---

## Notes for the implementer

- The `error` prop type is `string | string[]`. Renderers normalise with `[].concat(error)` when displaying.
- Adapters compute per-field `error`/`disabled`/`readOnly` for **leaf** fields only; group fields recurse through their nested `MultiFieldInput`, so nested inline errors work at any depth automatically.
- `onValidityChange`/`validityChange` fires the recursive `validateFields` result for the component's `fieldDescriptions`; on the top-level `MultiFieldInput` that is the whole form.
- Do not add touched/submitted state, a rule library, or async validation — those are explicitly out of scope for this cycle.
