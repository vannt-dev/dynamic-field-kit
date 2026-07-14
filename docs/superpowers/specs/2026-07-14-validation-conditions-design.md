# Validation & Dynamic Conditions — Design

Date: 2026-07-14
Status: Approved (design), pending implementation
Scope: Part 3, cycle 1 of 3 (the other cycles — new layout types, async `computeValue` — are separate specs).

## Summary

Add opt-in, app-supplied field **validation** and dynamic **disabled/readOnly**
conditions to dynamic-field-kit, without shipping any validation rule library or
form state into the framework-agnostic core. The core gains schema fields and
pure functions; each adapter wires them reactively into its `MultiFieldInput`.

All changes are **additive and backward compatible**: forms that declare none of
the new fields behave exactly as today.

## Philosophy constraints (from the README non-goals)

- Core ships **no validation rule logic** (no `required`/`min`/`max`/`pattern`
  helpers). Like `appearCondition` and `computeValue`, the app writes the rule
  function; the engine only runs it.
- Core holds **no form state**. There is no engine-managed touched/submitted
  tracking. Errors are surfaced reactively; _when to display_ them is the
  renderer's / app's decision.
- **Sync only** in this cycle. Async validation is deferred to the async
  `computeValue` cycle.

## Schema additions (`FieldDescription`, in core)

```ts
// Returns one or more error messages, or nothing when the value is valid.
validate?: (
  value: unknown,
  data: Properties,
  rootData?: Properties
) => string | string[] | undefined;

// Dynamic disabled/readOnly, mirroring appearCondition's signature.
disabledCondition?: (data: Properties, rootData?: Properties) => boolean;
readOnlyCondition?: (data: Properties, rootData?: Properties) => boolean;
```

`data` is the field's own level (the group item when nested in a repeatable
group); `rootData` is the top-level form data — identical to the threading
already implemented for `appearCondition`/`computeValue` in Part 2.

The static `disabled` flag added in Part 2 remains; the effective disabled state
is `disabled || disabledCondition?.(...)` (see `resolveDisabled`).

## Renderer contract additions (`FieldRendererProps`, in core)

```ts
error?: string | string[]; // current validation error(s) for this field
readOnly?: boolean;
// `disabled` already exists (added in Part 2)
```

Renderers may read `error` to show an inline message and `readOnly` to render a
non-editable control. Both are optional; existing renderers ignore them.

## Core pure functions (new file `packages/core/src/validation.ts`)

```ts
// Run one field's validate hook; always returns an array (empty when valid).
export function validateField(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties
): string[];

// Recursively validate a field list against data, descending into repeatable
// groups. Returns a flat errors map keyed by field path and an overall flag.
// Group paths use `${name}[${index}].${childName}` (e.g. "contacts[0].email").
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}
export function validateFields(
  fields: FieldDescription[],
  data: Properties,
  rootData?: Properties
): ValidationResult;

// Effective disabled/readOnly for a field given the current data.
export function resolveDisabled(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): boolean; // field.disabled || disabledCondition?.(data, rootData) || false

export function resolveReadOnly(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): boolean; // readOnlyCondition?.(data, rootData) || false
```

Behavioral rules:

- `validateField` returns `[]` when there is no `validate` hook or it returns a
  falsy value; a single string is wrapped into a one-element array.
- `validateFields` only descends into a field when `isFieldGroup(field)` is true;
  each group item is validated against the group's nested `fields`, with the same
  `rootData`.
- A field is **skipped** (not validated, contributes no errors, never makes the
  form invalid) when it is hidden by `appearCondition` **or** disabled (static
  `disabled` or `disabledCondition`, i.e. `resolveDisabled` is true). A `readOnly`
  field is still validated — its value still counts.
- `rootData` defaults to `data` (top-level call), consistent with
  `applyComputedValues`.

These functions are exported from `@dynamic-field-kit/core` for apps that want to
validate the whole form on submit (including group items), independent of any
adapter.

## Adapter wiring (React / Vue / Angular)

For each **leaf** field it renders, every adapter's `MultiFieldInput`:

1. Computes `error = validateField(field, data[field.name], data, rootData)` and
   passes it to the renderer via `FieldRendererProps.error` — but only for fields
   that are visible and enabled; a disabled field surfaces no error (same skip
   policy as `validateFields`). This is reactive and **always surfaced** for
   eligible fields — no touched/submit gating in the engine.
2. Computes effective `disabled = resolveDisabled(field, data, rootData)` and
   `readOnly = resolveReadOnly(field, data, rootData)` and passes both down.
3. Emits `onValidityChange?({ valid, errors })` for the fields at its own level
   whenever data changes. The payload is the same `ValidationResult` shape; it
   covers this level's directly-rendered fields.

Repeatable groups need no special aggregation wiring: each group item renders a
nested `MultiFieldInput`, which validates its own leaf fields and surfaces inline
errors at any depth automatically. Whole-tree validation (including group items)
is available to the app through the exported `validateFields` pure function.

`onValidityChange` is a new optional output on `MultiFieldInput`:

- React: `onValidityChange?: (result: ValidationResult) => void` prop.
- Vue: `onValidityChange` prop (same callback shape).
- Angular: `@Output() validityChange = new EventEmitter<ValidationResult>()`.

Threading matches the existing `rootData` wiring: the effective root passes down
through `FieldGroupInput` / group rendering so nested validation sees the top-level
form.

## Out of scope (this cycle)

- No rule library (`required`, `min`, `max`, `pattern`, ...). If desired later,
  it becomes a separate `@dynamic-field-kit/validation` package built on the
  `validate` hook.
- No engine-managed touched/submitted/dirty state.
- No async `validate`.
- No cross-field error aggregation beyond `validateFields`; no error summary
  component.

## Testing

- **Core** (`validation.test.ts`): `validateField` (no hook, string, array,
  falsy); `validateFields` recursion into groups with path keys, skipping of
  `appearCondition`-hidden **and** disabled fields, that `readOnly` fields are
  still validated, `rootData` passthrough, `valid` flag; `resolveDisabled`
  (static flag, condition, both) and `resolveReadOnly`.
- **Each adapter**: `error` reaches the renderer and updates when data changes;
  effective `disabled`/`readOnly` reflect conditions; `onValidityChange` /
  `validityChange` fires with the expected payload; hidden and disabled fields
  don't produce errors.

## Docs

- Root `README.md` and all four package READMEs: a "Validation & conditions"
  section covering the `validate` hook, `disabledCondition`/`readOnlyCondition`,
  the new renderer props (`error`, `readOnly`), `onValidityChange`, the
  `validateFields` submit-time helper, and an explicit note that display timing
  is the app's responsibility (headless).

## Backward compatibility

Every addition is optional. A schema with no `validate`/`disabledCondition`/
`readOnlyCondition` and a form with no `onValidityChange` handler behave exactly
as before this change. The new `FieldRendererProps` fields are optional and
ignored by existing renderers.
