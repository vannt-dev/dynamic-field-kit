// public-api.ts

// Components
export * from './components/BaseInput';
export * from './components/DynamicInput';
export * from './components/FieldInput';
export * from './components/MultiFieldInput';
export * from './components/imports';

// Layout
export * from './layout';
export * from './types/layout';

// Module
export * from './lib/dynamic-field-kit.module';

// Re-export types from core (only type, not export * )
export type {
  FieldTypeKey,
  FieldDescription,
  FieldRendererProps
} from '@dynamic-field-kit/core';

// Optional: expose registry for advanced use cases, but not required for basic usage
export { fieldRegistry } from '@dynamic-field-kit/core';

// Side-effect import
import './registerDefaults';