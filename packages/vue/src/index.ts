export { layoutRegistry } from "./layout";
import "./layout/defaultLayouts";

export { default as DynamicInput } from "./components/DynamicInput";
export { default as FieldInput } from "./components/FieldInput";
export { default as MultiFieldInput } from "./components/MultiFieldInput";

// Re-export selected core APIs
export {
    fieldRegistry,
    type FieldDescription,
    type FieldRendererProps,
    type FieldTypeKey,
    type FieldTypeMap,
    type Properties
} from "@dynamic-field-kit/core";

export type { LayoutConfig } from "./types/layout";

