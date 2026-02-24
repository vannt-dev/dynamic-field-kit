# @dynamic-field-kit/core

**Core types and field registry for dynamic-field-kit** (v1.0.7)

A lightweight, extensible **dynamic form engine** framework-agnostic. Define forms using **configuration objects** instead of hard-coded UI, and allow applications to **freely extend field types** without modifying the library.

`dynamic-field-kit` provides:
- A shared `fieldRegistry` singleton that stores renderer implementations across frameworks.
- Exchange types (`FieldDescription`, `FieldRendererProps`) that let you register renderers in any UI framework (React, Angular, Vue, etc.).
- An extensible `FieldTypeMap` interface so consumers add custom field types with full TypeScript support.

---

## ✨ Features

- Schema-driven dynamic forms
- Extensible field types (no enums, no hard-coded unions)
- Pluggable field renderers via registry
- Runtime conditional fields (`appearCondition`)
- Clean TypeScript declarations (DTS-safe)
- Framework-agnostic (works with React, Angular, Vue, or vanilla JS)
- Ideal for form builders & design systems

---

## 📦 Packages in the Monorepo

| Package | Description |
|------|------------|
| `@dynamic-field-kit/core` | Core types and field registry (you are here) |
| `@dynamic-field-kit/react` | React components (FieldInput, MultiFieldInput, DynamicInput) |
| `@dynamic-field-kit/angular` | Angular components and module (standalone + NgModule exports) |

---

## 📥 Installation

The core package is a peer dependency for UI framework adapters. Install together:

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
# or for Angular
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

---

## 🧱 Core Concepts

The library **does NOT define field types** like:
```ts
"text" | "number"
```

Instead, it exposes an **extendable interface** that applications can augment:
```ts
export interface FieldTypeMap {}
```

This allows:
- Unlimited custom field types
- Strong typing without locking consumers
- No need to rebuild the library

This pattern is used by mature libraries like **MUI, React Hook Form,** and **Redux Toolkit**.

## 🧩 Defining Field Types (App Side)

Create a `.d.ts` file in your app (e.g. src/types/dynamic-field.d.ts):

```ts
import "@dynamic-field-kit/core"

declare module "@dynamic-field-kit/core" {
  interface FieldTypeMap {
    text: string
    number: number
    checkbox: boolean
    select: string
  }
}
```
⚠️ Make sure this file is included in tsconfig.json.

---

## FieldRendererProps

```ts
export interface FieldRendererProps<T = any> {
  value?: T
  onValueChange?: (value: T) => void
  label?: string
}
```
👉 A common contract for all field renderers

---

### FieldDescription

A `FieldDescription` defines **what a field is**, not **how it looks**.

```ts
import { FieldDescription } from "@dynamic-field-kit/core"

const fields: FieldDescription[] = [
  {
    name: "username",
    type: "text",
    label: "Username"
  },
  {
    name: "age",
    type: "number",
    label: "Age",
    appearCondition: (data) => data.username !== ""
  }
]
```

**Common Properties**
| Property	| Description |
|------|------------|
| name	| Field key in form data |
| type	| Field renderer key |
| label	| UI label |
| value	| Default value |
| appearCondition	| Runtime visibility condition |

**Field Registry (Render Layer)**

The library does **not** ship UI components. Instead, applications register their own renderers using the `fieldRegistry` from the framework adapter (`@dynamic-field-kit/react`, `@dynamic-field-kit/angular`, etc.).

Example (framework adapter determines how to invoke the renderer):
```ts
import { fieldRegistry } from "@dynamic-field-kit/react" // or /angular

fieldRegistry.register("text", myTextRenderer)
fieldRegistry.register("checkbox", myCheckboxRenderer)
```



## ➕ Adding a New Field Type

You **do not** need to modify the library. Just extend `FieldTypeMap` in your application:

```ts
declare module "@dynamic-field-kit/core" {
  interface FieldTypeMap {
    date: Date
    myCustom: any
  }
}
```

Then register renderers using the framework-specific adapter:

- React: `import { fieldRegistry } from "@dynamic-field-kit/react"`
- Angular: `import { fieldRegistry } from "@dynamic-field-kit/angular"`

Now your custom types are fully type-safe throughout the codebase.

---
## 🧠 Domain Typing (Optional)
The library intentionally avoids enforcing domain types.
If you want strict typing, cast inside your app:

```ts
interface UserForm {
  age: number
}

const fields: FieldDescription[] = [
  {
    name: "age",
    type: "number",
    appearCondition: (data) =>
      (data as UserForm).age > 18
  }
]
```
This keeps the library generic while allowing strict typing in the app.

## 📚 Next Steps

- **React integration**: See `@dynamic-field-kit/react` for component usage and examples.
- **Angular integration**: See `@dynamic-field-kit/angular` for component usage and examples.
- **Framework-agnostic**: Use `fieldRegistry` from any adapter to register custom renderers.

---

## 🏗 Architecture

The monorepo contains framework-agnostic core and framework-specific adapters:

```
dynamic-field-kit (monorepo)
├─ packages/
│  ├─ core        # Framework-agnostic types and registry
│  ├─ react       # React renderer & DynamicInput component
│  └─ angular     # Angular components & DynamicFieldKitModule
```

All packages share the same `fieldRegistry` instance so registrations are visible across frameworks (in the same process).

---

## 🚫 Non-Goals
This library intentionally does not include:
-Built-in UI components
-Built-in UI components
-Form state management library

It is a **form engine**, not a full form framework.

## 📄 License
MIT © [vannt-dev](https://github.com/vannt-dev)