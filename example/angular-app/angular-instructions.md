# Wiring the Angular example into a consumer Angular app

This document shows the minimal steps to integrate the Angular example components in this repo into a real Angular application. It assumes you have `@angular/cli` available and will show copy-paste code you can drop into your app.

Summary
- The repository provides `packages/angular/src/examples/registerExample.ts` which registers an Angular component class (`TextFieldComponent`) into the shared `fieldRegistry`.
- To wire the example into a running Angular app:
  1. Create a new Angular app (or use an existing one).
  2. Install/ensure the monorepo packages are available (workspaces or local file references).
  3. Import the example registration at app startup so the `fieldRegistry` contains the Angular component class.
  4. Declare the Angular components from `@dynamic-field-kit/angular` in your `AppModule` declarations so Angular can instantiate them dynamically.

Quick start (recommended)

1) Create an Angular app (if you don't have one):

```bash
npm install -g @angular/cli
ng new my-dfk-app --defaults --skip-git
cd my-dfk-app
```

2) Make the monorepo packages available to the app. In a dev workflow you can use workspace linking or `npm link`/`file:` references. Example `package.json` entry (from repo root):

```json
// inside my-dfk-app/package.json (example)
{
  "dependencies": {
    "@dynamic-field-kit/core": "file:../packages/core",
    "@dynamic-field-kit/angular": "file:../packages/angular"
  }
}
```

Run `npm install` after editing `package.json`.

3) Import the example registration at app startup so the `fieldRegistry` is populated:

```ts
// src/main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import { AppModule } from './app/app.module'

// Import example registrations from the monorepo so they run on startup
import '@dynamic-field-kit/angular/src/examples'

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err))
```

4) Declare the DynamicInput and example component(s) in your module:

```ts
// src/app/app.module.ts
import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { AppComponent } from './app.component'

// Import adapter components from the monorepo (source path during development)
import { DynamicInput } from '@dynamic-field-kit/angular/src/components/DynamicInput'
import { FieldInput } from '@dynamic-field-kit/angular/src/components/FieldInput'
import { MultiFieldInput } from '@dynamic-field-kit/angular/src/components/MultiFieldInput'
import { TextFieldComponent } from '@dynamic-field-kit/angular/src/examples/text-field.component'

@NgModule({
  declarations: [AppComponent, DynamicInput, FieldInput, MultiFieldInput, TextFieldComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

5) Use the components in a template. Example `app.component.ts` / `app.component.html`:

```ts
// src/app/app.component.ts
import { Component } from '@angular/core'
import { FieldDescription } from '@dynamic-field-kit/core'

@Component({
  selector: 'app-root',
  template: `
    <dfk-multi-field-input [fieldDescriptions]="fields" (onChange)="onChange($event)"></dfk-multi-field-input>
  `
})
export class AppComponent {
  fields: FieldDescription[] = [
    { name: 'name', type: 'text', label: 'Name' }
  ]

  onChange(data: any) {
    console.log('data', data)
  }
}
```

Notes & caveats
- The Angular adapter in this repo is a lightweight scaffold designed for local development. When using a production Angular app you should publish the `@dynamic-field-kit/angular` package or import built artifacts from `dist/`.
- During local dev using `file:` dependencies, imports like `@dynamic-field-kit/angular/src/components/DynamicInput` reference the package source. This is convenient for rapid iteration but may require adjusting `tsconfig` paths or build tooling.
- Dynamic component creation in `DynamicInput` assumes the registered renderer is an Angular component class. Consumers must register Angular component classes (not React components) for Angular usage.

If you want, I can scaffold a runnable Angular demo app inside `example/angular-app/` (includes `package.json`, `src/`, and a minimal `ng` setup). This will be larger and require installing Angular CLI dependencies; say "scaffold" if you'd like that now.
