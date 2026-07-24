// public-api.ts

// Components
export * from './components/BaseInput';
export * from './components/DynamicInput';
export * from './components/FieldInput';
export * from './components/MultiFieldInput';

// Layout
export * from './layout';
export * from './types/layout';

// Module
export * from './lib/dynamic-field-kit.module';

// Re-export types from core (only type, not export * )
export type {
  FieldDescription,
  FieldRendererProps,
  FieldTypeKey,
} from '@dynamic-field-kit/core';

// Optional: expose registry for advanced use cases, but not required for basic usage
export { fieldRegistry, FieldRegistry } from '@dynamic-field-kit/core';

export {
  validateField,
  validateFields,
  resolveDisabled,
  resolveReadOnly,
} from '@dynamic-field-kit/core';
export type { ValidationResult } from '@dynamic-field-kit/core';

// Scoped registry: provide FIELD_REGISTRY on a component/route to give that
// subtree an isolated set of renderers.
export { FIELD_REGISTRY } from './fieldRegistryToken';
