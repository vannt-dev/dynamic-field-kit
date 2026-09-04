# @dynamic-field-kit/angular

Angular adapter for `@dynamic-field-kit/core`.

This package provides Angular components and a convenience module that render field schemas defined with `@dynamic-field-kit/core`.

Live demo: https://vannt-dev.github.io/dynamic-field-kit/angular/ — tabs for the
basic schema, the enterprise features (`createDynamicFormStore`, HTML5 renderers,
blur wiring, DevTools) and the multi-step wizard.

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

Note: `@dynamic-field-kit/core`, `@angular/core`, and `@angular/common` are **peer dependencies** — this adapter does not bundle or auto-install them, so add them to your app explicitly (as shown above). Keep a single `@dynamic-field-kit/core` version across all adapters so they share one registry.

If you need to pin versions explicitly:

```bash
npm install @dynamic-field-kit/core@^1.5.0 @dynamic-field-kit/angular@^1.5.0
```

## Exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `DynamicFieldKitModule`
- `fieldRegistry`
- `FieldRegistry` (class, for scoped registries)
- `FIELD_REGISTRY` (injection token)
- `createDynamicFormStore` (signal-based form state)
- `DynamicFormDevToolsComponent`
- `layoutRegistry` / `LayoutRegistry` (class, for a scoped layout registry)
- `ColumnLayout` / `RowLayout` / `GridLayout` (the standalone layout components, registered for you)
- `BaseInputComponent` — the abstract base your custom renderers extend
- `FieldInputProps` — the inputs `BaseInputComponent` declares; the Angular
  mirror of core's `FieldRendererProps`, and complete as of 1.6 — `touched`,
  `dirty`, `id` and the aria flags used to be missing here, which left an
  Angular renderer no way to tell whether a field had been touched
- `DynamicFormOptions` — what `createDynamicFormStore` takes: `fields`,
  `initialValues`, `validateOnBlur`, `validateOnChange`, `messages`
- `LayoutConfig` / `ColumnLayoutConfig` / `RowLayoutConfig` /
  `GridLayoutConfig` — the layout config types, re-exported from core
- `BaseLayoutConfig` / `ResponsiveLayoutConfig` — this adapter's historical
  aliases for core's `BaseLayout` / `ResponsiveLayout`, kept so existing
  imports keep resolving

Re-exported from `@dynamic-field-kit/core` so a consumer app rarely has to import
both packages:

- `validateField` / `validateFieldAsync` — one field, returns `string[]`
- `validateFields` / `validateFieldsAsync` — a whole schema, returns `ValidationResult`
- `collectFieldPaths` — the leaf paths a schema actually has in the data (`contacts[0].email`)
- `indexGroupPathMap` — index an error or touched map by repeatable-group item
- `resolveDisabled` / `resolveReadOnly` / `resolveOptions` — resolve a field's dynamic conditions and options
- `validators` — the built-in validator helpers (`required`, `email`, `minLength`, `compose`, …)
- `FieldDescription` / `FieldTypeKey` / `FieldRendererProps` — the schema and
  renderer contracts every adapter shares
- `ValidationResult` / `ValidationContext` — the context carries `signal` and the
  optional `t` message resolver
- `buildFieldRendererProps` / `makeFieldId` / `makeErrorId` /
  `FIELD_RENDERER_PROP_KEYS` — the renderer prop contract. `makeErrorId(id)` is
  what a custom renderer puts on its message element so `aria-describedby`
  resolves
- `createOptionsLoader` / `isAsyncOptions` — the async options engine
- `createMessageResolver` / `setDefaultMessages` / `MessageCatalog` — validation
  message catalog

`createDynamicFormStore` keeps live validation synchronous - a validator declared or
detected as async is never invoked on that path. Its `handleSubmit` runs one
async-capable pass, and `validateAsync()` is there when you need that answer
before submit. Runs are latest-wins: typing aborts the live run in flight, so a
stale result cannot overwrite a newer one, and a submit validates the snapshot
it was given under a controller of its own, so editing mid-submit no longer
cancels it. Declare a Promise-returning validator with
`validationMode: 'async'` and read `context.signal` (the fourth argument) to
cancel the request itself. See the
[core README](https://github.com/vannt-dev/dynamic-field-kit/tree/develop/packages/core#sync-vs-async-validation)
for the full rules.

For a complete UI integration, see the
[Angular Material recipe](../../docs/ui-kit-recipes.md#angular--angular-material).

## Supported Angular versions

The package declares `@angular/core` and `@angular/common` as `>=16 <22`,
and `scripts/verify-angular-peer-range.js` proves both ends in CI by installing
the packed tarballs against Angular 16 and 21 outside the workspace.

The floor is 16 because the form store is built on `signal` and `computed`,
which Angular introduced in 16. It read `>=14` until 1.6.0: npm accepted the
install on 14 and 15 and the package then failed on import.

The suite, the build and the demo app all run Angular 21, which is the version
the setup below is written for.

## Basic setup

1. Import the component and register fields before bootstrap.

```ts
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { fieldRegistry } from '@dynamic-field-kit/angular';
import { AppComponent } from './app/app.component';
import { TextFieldComponent } from './app/components/text-field.component';
import { NumberFieldComponent } from './app/components/number-field.component';

fieldRegistry.register('text', TextFieldComponent as any);
fieldRegistry.register('number', NumberFieldComponent as any);

bootstrapApplication(AppComponent, {
  providers: [],
}).catch((err) => console.error(err));
```

2. Use the component in a standalone component.

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldDescription } from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MultiFieldInput],
  templateUrl: './app.component.html',
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: 'name', type: 'text', label: 'Name' },
    { name: 'age', type: 'number', label: 'Age' },
  ];

  data: any = {};

  onChange(data: any) {
    this.data = data;
  }
}
```

3. Render your schema in a template.

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [properties]="data"
  (onChange)="onChange($event)"
></dfk-multi-field-input>
```

## Form state (`createDynamicFormStore`)

A signal-based store — the Angular counterpart of React and Vue's
`useDynamicForm`, with the same members. Read them as signals.

```ts
import {
  createDynamicFormStore,
  MultiFieldInput,
} from '@dynamic-field-kit/angular';

@Component({
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <form (ngSubmit)="onSubmit($event)">
      <dfk-multi-field-input
        [fieldDescriptions]="fields"
        [properties]="store.data()"
        [touched]="store.touched()"
        [errors]="store.errors()"
        (onChange)="store.handleChange($event)"
        (onBlurField)="store.handleBlur($event)"
        [initialProperties]="store.baselineValues()"
      ></dfk-multi-field-input>
      <button [disabled]="store.isSubmitting()">Save</button>
    </form>
  `,
})
export class MyForm {
  fields = fields;
  store = createDynamicFormStore({
    fields,
    initialValues: { country: 'VN' },
    validateOnBlur: true, // default
    messages: { required: 'Bắt buộc' }, // optional; see Validation & conditions
  });

  // handleSubmit returns a handler, exactly like React and Vue.
  onSubmit = this.store.handleSubmit((data) => this.save(data));
}
```

| Member                              | Description                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `data()`                            | Current form data, with `computeValue` fields applied                                                          |
| `errors()`                          | `Record<string, string[]>`, keyed like `validateFields`                                                        |
| `isValid()` / `isDirty()`           | Current synchronous validity / any value has changed                                                           |
| `baselineValues()`                  | Signal holding the values `dirty` is measured against - `initialValues` until `reset(newValues)` replaces them |
| `getDirtyValues()`                  | Only the entries differing from `baselineValues`, for PATCH-style submits                                      |
| `isValidating()`                    | An async validation pass is in flight                                                                          |
| `isValidationComplete()`            | Every applicable validator finished and none is in flight                                                      |
| `validationStatus()`                | `'valid'                                                                                                       | 'invalid' | 'pending'`— prefer it over`isValid`alone:`valid` cannot tell "nothing is wrong" from "nothing is wrong yet" |
| `isSubmitting()` / `isSubmitted()`  | In-flight submit / at least one submit attempted                                                               |
| `touched()`                         | Fields that have been blurred                                                                                  |
| `handleChange(data)`                | Replace the whole form data — bind to `(onChange)`                                                             |
| `setFieldValue(name, value)`        | Change one field                                                                                               |
| `handleBlur(name)`                  | Mark touched, and validate when `validateOnBlur`                                                               |
| `setFieldTouched(name, value?)`     | Set touched explicitly                                                                                         |
| `touchAll()`                        | Mark every field touched — `handleSubmit` already calls it                                                     |
| `resetTouched()`                    | Clear touched only, leaving data/errors/dirty alone                                                            |
| `validate()`                        | Validate now, returns a boolean                                                                                |
| `validateAsync()`                   | Validate now, awaiting Promise-based rules                                                                     |
| `reset(values?)`                    | Back to `initialValues` (or the values given), clearing errors/touched/submission                              |
| `handleSubmit(onValid, onInvalid?)` | Returns an async handler; calls `preventDefault`, validates, then dispatches                                   |

`MultiFieldInput` emits `(onBlurField)` with the field's name, driven by a
`focusout` listener — so it works with any renderer, without the renderer
needing a blur output of its own.

Binding `[touched]="store.touched()"` and `[errors]="store.errors()"` makes the
store the single source of truth for renderer metadata. Touched state is what
makes an invalid submit visible: `handleSubmit` marks every
field touched before validating, so a renderer that gates its error on the
`touched` input shows it even for fields the user never focused. `reset()`
clears touched the same way. Leave `[touched]` unbound and `MultiFieldInput`
falls back to tracking it internally from blur alone; in that mode call its
public `resetTouched()` / `setFieldTouched(name, value?)` (via a `@ViewChild`)
to clear it, and listen to `(touchedChange)` for the next map.

## Field ids

Each field renders with ``id={`${idPrefix}-${name}`}``, where `idPrefix`
defaults to a value unique to the `dfk-multi-field-input` instance. Two forms
containing a field of the same name therefore no longer emit the same DOM id
twice, and the id now reaches renderers as the `id` input.

```html
<!-- pinned ids — reproduces the pre-1.6 `dfk-field-title` -->
<dfk-multi-field-input [fieldDescriptions]="fields" idPrefix="dfk-field">
</dfk-multi-field-input>
```

For one field, set `id` on its `FieldDescription`; it wins over the prefix.

## Default renderers

`text` · `number` · `password` · `email` · `textarea` · `checkbox` · `select` ·
`radio` · `range` · `file` · `date` · `time` · `datetime-local` · `switch`

Any type you have not registered falls back to one of these. `file` emits a
`File` (or `File[]` when `multiple` is set), `range` and `number` emit numbers,
`checkbox` / `switch` emit booleans; everything else emits strings.

Since 1.7.0 a default renderer also renders its validation message, as
`<div id="{fieldId}-error" class="dfk-field-error" role="alert">`, which is what
`aria-describedby` points at. Before that they were handed `error` and dropped
it, so the form showed nothing. A registered custom renderer is unaffected — the
node is emitted only where a default was used, so you never get two copies. Hide
it with `.dfk-field-error { display: none }` if you want the old silence.

## DevTools

```html
<dfk-dev-tools
  [data]="store.data()"
  [errors]="store.errors()"
  [touched]="store.touched()"
  [isDirty]="store.isDirty()"
  [fields]="fields"
></dfk-dev-tools>
```

Import `DynamicFormDevToolsComponent`. A floating overlay with data / errors /
meta / fields tabs; the collapsed button carries a red badge with the number of
fields in error.

## Layouts

`MultiFieldInput` supports `column`, `row`, `grid`, and `responsive` (mobile/desktop with a custom breakpoint), matching the React and Vue adapters:

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [layout]="{ type: 'grid', columns: 3, gap: 16 }"
></dfk-multi-field-input>

<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [layout]="{
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 2, gap: 12 }
  }"
></dfk-multi-field-input>
```

Those four names resolve through `layoutRegistry`, which holds standalone
components rather than render functions — the Angular equivalent of the React
and Vue layout registries. `ColumnLayout`, `RowLayout` and `GridLayout` are
registered for you when you import the package root; register your own the same
way:

```ts
import { Component } from '@angular/core';
import { layoutRegistry } from '@dynamic-field-kit/angular';

@Component({
  standalone: true,
  selector: 'app-stack-tight',
  template: `<div style="display: grid; gap: 8px"><ng-content /></div>`,
})
export class StackTightLayout {}

layoutRegistry.register('stack-tight', StackTightLayout);
```

`LayoutRegistry` is the class behind that singleton, for when you want an
isolated set of layouts instead of the shared one.

## Derived fields with `computeValue`

Give a field a `computeValue` to derive its value from the rest of the form data whenever any field changes:

```ts
fields: FieldDescription[] = [
  { name: 'firstName', type: 'text' },
  { name: 'lastName', type: 'text' },
  {
    name: 'fullName',
    type: 'text',
    computeValue: (data) => `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
];
```

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

### Validation messages

Set the built-in validators' messages once per form instead of on every field:

```ts
const store = createDynamicFormStore({
  fields,
  messages: { required: 'Bắt buộc', minLength: 'Tối thiểu {min} ký tự' },
});
```

A message passed straight to a validator still wins, and any key omitted falls
back to the English default. `setDefaultMessages(catalog)` sets a process-wide
one for code calling `validateFields` directly. Full key list in the
[core README](../core/README.md#validation-messages). **No locale bundles
ship** — the mechanism is here, the translations are yours.

Forward `ariaInvalid`, `ariaRequired` and `ariaDescribedBy` from your renderer
too, and put `makeErrorId(id)` on whatever element shows the message.
`focusFirstInvalidField` selects `[aria-invalid="true"]`, so a renderer that
drops those props makes that helper silently do nothing. See
[the recipes](../../docs/ui-kit-recipes.md#forward-the-aria-props).

### Async options

`options` may return a promise. The renderer receives `optionsStatus`
(`'idle' | 'loading' | 'ready' | 'error'`), `optionsError` and
`onOptionsQuery`:

```ts
{
  name: 'assignee',
  type: 'userPicker',
  options: async (data, _rootData, ctx) =>
    fetch(`/api/users?q=${ctx?.query ?? ''}`, { signal: ctx?.signal })
      .then((r) => r.json()),
  optionsDeps: (data) => [data.team],  // reload when this changes; default []
  debounceMs: 300,                     // collapses rapid reloads into one fetch
}
```

Superseded requests are aborted and out-of-order responses discarded, so the
list always reflects the newest request. Static and synchronous options are
untouched and never enter a loading state. See the
[core README](../core/README.md#async-options).

## Repeatable field groups

A field with `fields` renders as a repeatable group: `data[name]` becomes an array of items, each shaped by the nested `fields`, with "Add"/"Remove" controls rendered automatically.

```ts
fields: FieldDescription[] = [
  {
    name: 'contacts',
    type: 'group',
    label: 'Contacts',
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' },
    keyField: 'id', // optional: stable trackBy key instead of the array index
    minItems: 1,
    maxItems: 5,
  },
];
```

```html
<dfk-multi-field-input [fieldDescriptions]="fields"></dfk-multi-field-input>
```

## Scoped registries

`fieldRegistry` is a process-wide singleton. To give a component or route its own renderers, provide the `FIELD_REGISTRY` token with an isolated `FieldRegistry`. Components without an override keep using the global singleton.

```ts
import { FieldRegistry, FIELD_REGISTRY } from '@dynamic-field-kit/angular';

const registry = new FieldRegistry();
registry.register('text', TextFieldComponent as any);

@Component({
  selector: 'app-scoped-form',
  standalone: true,
  imports: [MultiFieldInput],
  providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
  template: `<dfk-multi-field-input [fieldDescriptions]="fields" />`,
})
export class ScopedFormComponent {}
```

## Passing renderer-specific props

The generic adapter forwards only the shared `FieldRendererProps`. For inputs specific to one renderer (e.g. `acceptFile`, `maxLength`), pass them per field via `FieldDescription.props`; they are set on the renderer instance verbatim.

```ts
{ name: 'avatar', type: 'file', props: { acceptFile: 'image/*' } }
```

## Legacy setup (NgModule apps)

```ts
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { DynamicFieldKitModule } from '@dynamic-field-kit/angular';

@NgModule({
  imports: [BrowserModule, DynamicFieldKitModule],
})
export class AppModule {}
```

## Type augmentation

```ts
import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
  }
}
```

## Notes

- Register Angular component classes in `fieldRegistry`.
- Do not register React or Vue renderers in the Angular adapter.
- `MultiFieldInput` supports `column`, `row`, `grid`, and `responsive` layouts, and derives fields using `computeValue`.
- Fields with `fields` render as repeatable groups instead of going through `fieldRegistry`.
- The shared schema and field types still come from `@dynamic-field-kit/core`.

## License

MIT
