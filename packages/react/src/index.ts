// 🔁 Re-export từ core (CÙNG INSTANCE ĐÃ BUNDLE)
export {
  fieldRegistry,
  type FieldTypeKey,
  type FieldDescription,
  type FieldRendererProps,
} from "@dynamic-field-kit/core"

export { default as DynamicInput } from "./DynamicInput"
export { default as FieldInput } from "./FieldInput"
export { default as MultiFieldInput } from "./MultiFieldInput"
