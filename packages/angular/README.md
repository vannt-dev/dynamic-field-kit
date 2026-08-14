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
npm install @dynamic-field-kit/core@^1.0.12 @dynamic-field-kit/angular@^1.2.3
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

Re-exported from `@dynamic-field-kit/core` so a consumer app rarely has to import
both packages:

- `validateField` / `validateFieldAsync` — one field, returns `string[]`
- `validateFields` / `validateFieldsAsync` — a whole schema, returns `ValidationResult`
- `resolveDisabled` / `resolveReadOnly` / `resolveOptions` — resolve a field's dynamic conditions and options
- `validators` — the built-in validator helpers (`required`, `email`, `minLength`, `compose`, …)
- `ValidationResult`

`createDynamicFormStore` validates **synchronously** via `validateFields`,
including on submit. Fields whose `validate` hook returns a Promise are treated
as valid on that path, so run async rules through `validateFieldsAsync`
yourself. See the
[core README](https://github.com/vannt-dev/dynamic-field-kit/tree/develop/packages/core#sync-vs-async-validation)
for the full rules.

## Basic setup (Angular 19+)

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
        (onChange)="store.handleChange($event)"
        (onBlurField)="store.handleBlur($event)"
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
  });

  // handleSubmit returns a handler, exactly like React and Vue.
  onSubmit = this.store.handleSubmit((data) => this.save(data));
}
```

| Member                              | Description                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `data()`                            | Current form data, with `computeValue` fields applied                             |
| `errors()`                          | `Record<string, string[]>`, keyed like `validateFields`                           |
| `isValid()` / `isDirty()`           | No errors recorded / any value has changed                                        |
| `isSubmitting()` / `isSubmitted()`  | In-flight submit / at least one submit attempted                                  |
| `touched()`                         | Fields that have been blurred                                                     |
| `handleChange(data)`                | Replace the whole form data — bind to `(onChange)`                                |
| `setFieldValue(name, value)`        | Change one field                                                                  |
| `handleBlur(name)`                  | Mark touched, and validate when `validateOnBlur`                                  |
| `setFieldTouched(name, value?)`     | Set touched explicitly                                                            |
| `validate()`                        | Validate now, returns a boolean                                                   |
| `reset(values?)`                    | Back to `initialValues` (or the values given), clearing errors/touched/submission |
| `handleSubmit(onValid, onInvalid?)` | Returns an async handler; calls `preventDefault`, validates, then dispatches      |

`MultiFieldInput` emits `(onBlurField)` with the field's name, driven by a
`focusout` listener — so it works with any renderer, without the renderer
needing a blur output of its own.

## Default renderers

`text` · `number` · `password` · `email` · `textarea` · `checkbox` · `select` ·
`radio` · `range` · `file` · `date` · `time` · `datetime-local` · `switch`

Any type you have not registered falls back to one of these. `file` emits a
`File` (or `File[]` when `multiple` is set), `range` and `number` emit numbers,
`checkbox` / `switch` emit booleans; everything else emits strings.

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

## Legacy setup (Angular 14 and earlier with NgModule)

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
