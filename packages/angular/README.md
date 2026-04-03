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
- `MultiFieldInput` supports `column`, `row`, and `grid` layouts.
- The shared schema and field types still come from `@dynamic-field-kit/core`.

## License

MIT
