import { registerDefaults } from "./registerDefaults"

registerDefaults()

export { layoutRegistry } from "./layout"

export { default as DynamicInput } from "./components/DynamicInput"
export { default as FieldInput } from "./components/FieldInput"
export { default as MultiFieldInput } from "./components/MultiFieldInput"

export type { FieldTypeKey } from "./types"
// Re-export from core
export {
    fieldRegistry,
    type FieldDescription,
    type FieldRendererProps,
    type Properties,
} from "@dynamic-field-kit/core"
