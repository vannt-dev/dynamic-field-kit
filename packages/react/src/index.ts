import { registerDefaults } from "./registerDefaults"

registerDefaults()


export { layoutRegistry } from "./layout"


export { default as DynamicInput } from "./components/DynamicInput"
export { default as FieldInput } from "./components/FieldInput"
export { default as MultiFieldInput } from "./components/MultiFieldInput"


export type { LayoutConfig } from "./types/layout"
// 🔁 Re-export từ core (CÙNG INSTANCE ĐÃ BUNDLE)
export {
    fieldRegistry,
    type FieldTypeKey,
    type FieldDescription,
    type FieldRendererProps,
} from "@dynamic-field-kit/core"
