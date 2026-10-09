export {
  layoutRegistry,
  LayoutRegistry,
  type LayoutProps,
  type LayoutRenderer,
} from './layout/layoutRegistry.js';
import './layout/defaultLayouts.js';

export { default as DynamicInput } from './components/DynamicInput.svelte';
export { default as FieldInput } from './components/FieldInput.svelte';
export { default as MultiFieldInput } from './components/MultiFieldInput.svelte';
export type { DynamicFormBinding } from './components/MultiFieldInput.svelte';
export {
  defaultRenderersMap,
  getDefaultRenderer,
  type FieldRenderer,
} from './defaultRenderers.js';

export {
  provideFieldRegistry,
  useFieldRegistry,
  FieldRegistryKey,
} from './fieldRegistryContext.js';
export {
  createDynamicForm,
  type CreateDynamicFormOptions,
  type DynamicForm,
} from './createDynamicForm.svelte.js';

// Re-export selected core APIs
export {
  fieldRegistry,
  FieldRegistry,
  validateField,
  validateFieldAsync,
  validateFields,
  validateFieldsAsync,
  collectFieldPaths,
  indexGroupPathMap,
  resolveDisabled,
  resolveReadOnly,
  resolveOptions,
  validators,
  type FieldDescription,
  type FieldRendererProps,
  type FieldTypeKey,
  type FieldTypeMap,
  type Properties,
  type ValidationResult,
  type ValidationContext,
  type LayoutConfig,
  buildFieldRendererProps,
  makeFieldId,
  makeErrorId,
  FIELD_RENDERER_PROP_KEYS,
} from '@dynamic-field-kit/core';
