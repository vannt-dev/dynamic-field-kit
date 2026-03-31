import "./layout/defaultLayouts"
import "./layout/responsiveLayout"


export { layoutRegistry } from "./layout"


export { default as DynamicInput } from "./components/DynamicInput"
export { default as FieldInput } from "./components/FieldInput"
export { default as MultiFieldInput } from "./components/MultiFieldInput"
export { fieldRegistry, type ReactFieldRenderer, type ReactFieldRegistry } from "./fieldRegistry"


export type { LayoutConfig } from "./types/layout"
// Re-export selected core APIs
export {
    type FieldTypeKey,
    type FieldDescription,
    type FieldRendererProps,
} from "@dynamic-field-kit/core"
