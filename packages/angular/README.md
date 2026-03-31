# @dynamic-field-kit/angular

Angular adapter for `@dynamic-field-kit/core`.

This package provides Angular components and a convenience module that render field schemas defined with `@dynamic-field-kit/core`.

Demo app: https://github.com/vannt-dev/dynamic-field-kit-demo

## Install

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

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

## Basic setup

1. Import `DynamicFieldKitModule` in your Angular module.

```ts
import { BrowserModule } from "@angular/platform-browser"
import { NgModule } from "@angular/core"
import { DynamicFieldKitModule } from "@dynamic-field-kit/angular"

@NgModule({
  imports: [BrowserModule, DynamicFieldKitModule],
})
export class AppModule {}
```

2. Register Angular field components before bootstrap.

```ts
import "zone.js"
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic"
import { fieldRegistry } from "@dynamic-field-kit/angular"
import { AppModule } from "./app/app.module"
import { TextFieldComponent } from "./app/components/text-field.component"
import { NumberFieldComponent } from "./app/components/number-field.component"

fieldRegistry.register("text", TextFieldComponent as any)
fieldRegistry.register("number", NumberFieldComponent as any)

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err))
```

3. Render your schema in a template.

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [properties]="data"
  (onChange)="onChange($event)"
></dfk-multi-field-input>
```

4. Define your field schema in the component.

```ts
import { Component } from "@angular/core"
import { FieldDescription } from "@dynamic-field-kit/core"

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: "name", type: "text", label: "Name" },
    { name: "age", type: "number", label: "Age" },
  ]

  data: any = {}

  onChange(data: any) {
    this.data = data
  }
}
```

## Type augmentation

```ts
import "@dynamic-field-kit/core"

declare module "@dynamic-field-kit/core" {
  interface FieldTypeMap {
    text: string
    number: number
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
