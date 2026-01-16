# Dynamic Field Kit

A type-safe, extensible dynamic field system for React applications, designed for **scalable forms** and **design systems**.

This library allows applications to **define and extend field types freely** (e.g. text, number, checkbox, date, custom) **without modifying the library code**.

---

## ✨ Features

- ✅ Fully type-safe with TypeScript
- ✅ Supports unlimited custom field types
- ✅ Uses TypeScript declaration merging
- ✅ No hard-coded enums or unions
- ✅ DTS build safe
- ✅ Ideal for form builders & design systems

---

## 📦 Packages

| Package | Description |
|------|------------|
| `@dynamic-field-kit/core` | Core types and field registry |
| `@dynamic-field-kit/react` | React components for rendering forms |

---

## 📥 Installation

```bash
npm install @dynamic-field-kit/react
```

**Peer dependency**

```txt
react >= 17
```

---

## 🧱 Core Concepts

The library does **NOT** define field types like text | number | select.

Instead, it exposes an extendable interface:

export interface FieldTypeMap {}


Applications can **augment** this interface to define their own field types.

This pattern is used by libraries like:
- React Hook Form
- MUI
- Redux Toolkit

## 🧩 Defining Field Types (App Side)

Create a .d.ts file in your app (e.g. src/types/dynamic-field.d.ts):

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

- ✅ Field types are just string keys
- ✅ Values are fully type-safe
- ✅ No enum required

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

**Key properties**
- `name` – field key in form data
- `type` – renderer key
- `appearCondition` – runtime visibility condition
- No domain-specific typing enforced

**FieldRegistry**
Renderers are registered globally by field `type`.
```ts
import { registerField } from "@dynamic-field-kit/react"
import { Input } from "@heroui/react"

registerField("text", ({ value, onValueChange }) => (
  <Input
    value={String(value ?? "")}
    onChange={(e) => onValueChange?.(e.target.value)}
  />
))

registerField("number", ({ value, onValueChange }) => (
  <Input
    type="number"
    value={value ?? ""}
    onChange={(e) => onValueChange?.(Number(e.target.value))}
  />
))

```
***dynamic-field-kit*** does not ship UI components.
You decide how each field is rendered.

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

## 🧠 Domain Typing (Optional)
The library intentionally avoids enforcing domain types.
If you want strong typing in your application, you can cast locally:

```tsx
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
  field={field}
  data={formData}
  onChange={(value, key) => {}}
/>
```
---

**<MultiFieldInput />**

Main form engine component.

```tsx
interface Props<T = Record<string, any>> {
  fields: FieldDescription<any, T>[]
  value?: T
  onChange?: (data: T) => void
}
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

## 📄 License

MIT@vannt-dev