# @dynamic-field-kit/angular

Lightweight Angular adapters for `@dynamic-field-kit/core`.

This package exposes Angular components and a convenience NgModule that integrate with the shared `fieldRegistry` from `@dynamic-field-kit/core`.

Quick overview
- Exports `DynamicInput`, `FieldInput`, `MultiFieldInput`, layout components, and `DynamicFieldKitModule`.
- Uses the shared `fieldRegistry` from `@dynamic-field-kit/core` to resolve Angular field renderers at runtime.
- Can be consumed as a packaged library, or linked locally from `packages/angular/dist` during development.
- `MultiFieldInput` currently supports `column`, `row`, and `grid` layout values.

Usage (consumer Angular app)

1. Install the packages:

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

2. Import `DynamicFieldKitModule` in your Angular module:

```ts
import { DynamicFieldKitModule } from '@dynamic-field-kit/angular'

@NgModule({
	imports: [BrowserModule, DynamicFieldKitModule],
})
export class AppModule {}
```

3. Register your Angular field components in the shared registry before bootstrap:

```ts
// src/main.ts
import 'zone.js'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { fieldRegistry } from '@dynamic-field-kit/angular'
import { AppModule } from './app/app.module'
import { TextFieldComponent } from './app/components/text-field.component'
import { NumberFieldComponent } from './app/components/number-field.component'

fieldRegistry.register('text', TextFieldComponent as any)
fieldRegistry.register('number', NumberFieldComponent as any)

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err))
```

4. Render fields in a template:

```html
<dfk-multi-field-input
  [fieldDescriptions]="fields"
  [properties]="data"
  (onChange)="onChange($event)"
></dfk-multi-field-input>
```

5. Example component state:

```ts
import { Component } from '@angular/core'
import { FieldDescription } from '@dynamic-field-kit/core'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: 'name', type: 'text', label: 'Name' },
    { name: 'age', type: 'number', label: 'Age' },
  ]

  data: any = {}

  onChange(data: any) {
    this.data = data
  }
}
```

Local development
- During local development, point your Angular app at the built package output instead of importing from `src/`:

```json
{
  "dependencies": {
    "@dynamic-field-kit/core": "file:../../packages/core",
    "@dynamic-field-kit/angular": "file:../../packages/angular/dist"
  }
}
```

- When using a local `file:` dependency on Windows or via symlinked installs, set `preserveSymlinks: true` in the Angular builder options to avoid runtime issues with linked packages.

Build & publish
- Build locally with `ng-packagr`:

```bash
cd packages/angular
npm run build
```

- Publish to npm:

```bash
cd packages/angular
npm publish --access public
```

Notes & caveats
- Register Angular component classes in `fieldRegistry`. Do not register React or Vue renderers when using the Angular adapter.
- `DynamicFieldKitModule` is the recommended integration path for consumer apps.
- Standalone exports are still available for advanced composition, but most apps should start with the module.
- Text fields default to an empty string when no value is present, so empty controls render as blank instead of `undefined`.
- Supported `layout` values are `column`, `row`, and `grid`.

Examples & docs
- See `example/angular-instructions.md` for detailed wiring steps.
- Try the local scaffold at `example/angular-app/` for a hands-on demo.
