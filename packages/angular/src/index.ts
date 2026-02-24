import { registerDefaults } from "./registerDefaults"

registerDefaults()


export { layoutRegistry } from "./layout"


export { DynamicInput } from "./components/DynamicInput"
export { FieldInput } from "./components/FieldInput"
export { MultiFieldInput } from "./components/MultiFieldInput"

export type { LayoutConfig } from "./types/layout"
export {
  fieldRegistry,
  type FieldTypeKey,
  type FieldDescription,
  type FieldRendererProps,
} from "@dynamic-field-kit/core"
