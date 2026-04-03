// Delegate all framework-agnostic types to the core package to avoid
// any framework-specific type declarations leaking into core.
export {
  FieldTypeKey,
  FieldTypeMap,
  Properties,
  FieldRendererProps,
  FieldDescription,
} from '@dynamic-field-kit/core';
