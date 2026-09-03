export { layoutRegistry } from './layout';
import './layout/defaultLayouts';
import './layout/responsiveLayout';

export { default as DynamicInput } from './components/DynamicInput';
export { default as FieldInput } from './components/FieldInput';
export { default as MultiFieldInput } from './components/MultiFieldInput';
export type { DynamicFormBinding } from './components/MultiFieldInput';
export { defaultRenderersMap, getDefaultRenderer } from './defaultRenderers';

export {
  provideFieldRegistry,
  useFieldRegistry,
  FieldRegistryKey,
} from './fieldRegistryContext';
export { useDynamicForm } from './useDynamicForm';
export { DynamicFormDevTools } from './components/DynamicFormDevTools';

// Re-export selected core APIs
export {
  fieldRegistry,
  FieldRegistry,
  validateField,
  validateFieldAsync,
  validateFields,
  validateFieldsAsync,
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
  buildFieldRendererProps,
  makeFieldId,
  FIELD_RENDERER_PROP_KEYS,
} from '@dynamic-field-kit/core';

export type { LayoutConfig } from './types/layout';
