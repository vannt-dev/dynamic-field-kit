# @dynamic-field-kit/angular

Angular adapter for `@dynamic-field-kit/core`.

This package provides Angular components and a convenience module that render field schemas defined with `@dynamic-field-kit/core`.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

Note: Core is shared runtime. Install core separately and ensure a single version is used across adapters to avoid duplicate registries.

- Install with core: `npm install @dynamic-field-kit/core @dynamic-field-kit/angular`

If you need to pin versions explicitly:

```bash
npm install @dynamic-field-kit/core@^1.0.12 @dynamic-field-kit/angular@^1.2.3
```

## What it exports

- `DynamicInput`
- `FieldInput`
- `MultiFieldInput`
- `DynamicFieldKitModule`
- `fieldRegistry`
- `FieldRegistry` (class, for scoped registries)
- `FIELD_REGISTRY` (injection token)

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
