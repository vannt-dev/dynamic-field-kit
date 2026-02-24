# Dynamic Field Kit

A lightweight, extensible **dynamic form engine** for React and Angular, built for scalable applications and design systems.

`dynamic-field-kit` lets you define forms using **configuration objects** instead of hard-coded UI, and allows applications to **freely extend field types** across frameworks without modifying the library. Register custom renderers in React, Angular, or vanilla JS using a shared field registry.

---

## ✨ Features

- Schema-driven dynamic forms
- Extensible field types (no enums, no hard-coded unions)
- Pluggable field renderers via shared registry
- Runtime conditional fields (`appearCondition`)
- Clean TypeScript declarations (DTS-safe)
- Framework-agnostic core (works with React, Angular, Vue, or vanilla JS)
- Ideal for form builders & design systems

---

## 📦 Packages

| Package | Description |
|------|------------|
| `@dynamic-field-kit/core` | Core types and shared field registry |
| `@dynamic-field-kit/react` | React components (FieldInput, MultiFieldInput, DynamicInput) |
| `@dynamic-field-kit/angular` | Angular components and module (standalone + NgModule) |

---

## 📥 Installation

**For React:**
```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
```

**For Angular:**
```bash
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

```ts
import { fieldRegistry } from "@dynamic-field-kit/react" // or /angular

fieldRegistry.register("text", myTextRenderer)
fieldRegistry.register("checkbox", myCheckboxRenderer)
```

---

## 📖 Framework-Specific Usage

For detailed setup and component API:

- **React**: See [`packages/react/README.md`](packages/react/README.md)
- **Angular**: See [`packages/angular/README.md`](packages/angular/README.md)
- **Core concepts**: See [`packages/core/README.md`](packages/core/README.md)

---

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

The library intentionally avoids enforcing domain types. If you want strict typing, cast inside your app:

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

---

## 🏗 Architecture

The monorepo contains framework-agnostic core and framework-specific adapters:

```
dynamic-field-kit (monorepo)
├─ packages/
│  ├─ core        # Framework-agnostic types and registry
│  ├─ react       # React components & DynamicInput
│  └─ angular     # Angular components & DynamicFieldKitModule
├─ example/       # Demo apps and integration guides
└─ .github/       # Copilot AI agent instructions
```

All packages share the same `fieldRegistry` instance, so registrations are visible across frameworks (in the same process).

---

## 🚫 Non-Goals

This library intentionally does not include:
- Built-in UI components (bring your own renderers)
- Form state management
- Validation logic

It is a **form engine**, not a full form framework.

## 📄 License

MIT © [vannt-dev](https://github.com/vannt-dev)

## 🤝 Contributing

Contributions welcome! Please see individual package READMEs for setup and development instructions.