// index.ts

export { layoutRegistry } from "./layout";

export { registerDefaults } from "./registerDefaults";

export { default as DynamicInput } from "./components/DynamicInput";
export { default as FieldInput } from "./components/FieldInput";
export { default as MultiFieldInput } from "./components/MultiFieldInput";

export type { FieldDescription, FieldTypeKey } from "./types";

// Re-export selected core APIs
export {
    fieldRegistry,
    type FieldRendererProps, type FieldTypeMap, type Properties
} from "@dynamic-field-kit/core";

