# Dynamic Field Kit

A lightweight, extensible **dynamic form engine** for React, built for scalable applications and design systems.

`dynamic-field-kit` lets you define forms using **configuration objects** instead of hard-coded UI, and allows applications to **freely extend field types** (`text`, `number`, `checkbox`, `select`, `date`, `custom`, …) without modifying the library.

---

## ✨ Features

- Schema-driven dynamic forms
- Extensible field types (no enums, no hard-coded unions)
- Pluggable field renderers via registry
- Runtime conditional fields (`appearCondition`)
- Clean TypeScript declarations (DTS-safe)
- Core logic separated from React rendering
- Ideal for form builders & design systems

---

## 📦 Packages

| Package | Description |
|------|------------|
| `@dynamic-field-kit/core` | Core types and field registry |
| `@dynamic-field-kit/react` | React components (FieldInput, MultiFieldInput, DynamicInput) |

---

## 📥 Installation

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
```

**Peer dependency**

```txt
react >= 17
```

---

## 🧱 Core Concepts

The library **does NOT define field types** like:
```ts
"text" | "number" | "select"
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
import "@dynamic-field-kit/react"

declare module "@dynamic-field-kit/react" {
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
The library does **not** ship UI components.

Instead, applications register their own renderers.

```ts
import { fieldRegistry } from "@dynamic-field-kit/core"

fieldRegistry.register("text", ({ value, onValueChange, label }) => (
  <div>
    <label>{label}</label>
    <input
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </div>
))

fieldRegistry.register("checkbox", ({ value, onValueChange, label }) => (
  <label>
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e) => onValueChange?.(e.target.checked)}
    />
    {label}
  </label>
))

```

---

## ⚛️ React Usage

**MultiFieldInput (Main Form Engine)**

```tsx
import { MultiFieldInput } from "@dynamic-field-kit/react"
import { FieldDescription } from "@dynamic-field-kit/core"

const fields: FieldDescription[] = [
  { name: "email", type: "text", label: "Email" },
  { name: "age", type: "number", label: "Age" }
]

const Example = () => {
  return (
    <MultiFieldInput
      fieldDescriptions={fields}
      onChange={(data) => {
        console.log("Form data:", data)
      }}
    />
  )
}
```

**Controlled Form**
```tsx
const [formData, setFormData] = useState({})

<MultiFieldInput
  fieldDescriptions={fields}
  properties={formData}
  onChange={setFormData}
/>
```

---

## ➕ Adding a New Field Type

You **do not** need to modify the library.

Just extend `FieldTypeMap`:

```ts
declare module "@dynamic-field-kit/react" {
  interface FieldTypeMap {
    date: Date
  }
}
```

Then register a renderer:

```ts
fieldRegistry.register("date", ({ value, onValueChange }) => (
  <input
    type="date"
    value={value ? value.toISOString().slice(0, 10) : ""}
    onChange={(e) =>
      onValueChange?.(new Date(e.target.value))
    }
  />
))
```

Now `"date"` is fully type-safe everywhere.

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

---

## 🧩 Components API

**<DynamicInput />**

Resolves and renders a field based on its type.

```tsx
<DynamicInput type="text" value="hello" />
```
---

**<FieldInput />**

Renders a single field with value binding.

```tsx
<FieldInput
  fieldDescription={field}
  renderInfos={formData}
  onChange={(value, key) => {}}
/>
```
---

## 🏗 Architecture

```
dynamic-field-kit
├─ packages/
│  ├─ core    # framework-agnostic types
│  └─ react   # React renderer + registry
```

---

## 🚫 Non-Goals
This library intentionally does not include:
-Built-in UI components
-Built-in UI components
-Form state management library

It is a **form engine**, not a full form framework.