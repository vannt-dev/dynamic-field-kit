import './layout/defaultLayouts';
import './layout/responsiveLayout';

export { layoutRegistry } from './layout';

export { default as DynamicInput } from './components/DynamicInput';
export { default as FieldInput } from './components/FieldInput';
export { default as MultiFieldInput } from './components/MultiFieldInput';
export { DynamicFormDevTools } from './components/DynamicFormDevTools';
export { useDynamicForm } from './useDynamicForm';
export { defaultRenderersMap, getDefaultRenderer } from './defaultRenderers';

export {
  fieldRegistry,
  type ReactFieldRenderer,
  type ReactFieldRegistry,
} from './fieldRegistry';
export {
  FieldRegistryProvider,
  useFieldRegistry,
  type FieldRegistryProviderProps,
} from './FieldRegistryContext';
export { FieldRegistry } from '@dynamic-field-kit/core';

export type { LayoutConfig } from './types/layout';
// Re-export selected core APIs
export {
  type FieldTypeKey,
  type FieldDescription,
  type FieldRendererProps,
} from '@dynamic-field-kit/core';
export {
  validateField,
  validateFieldAsync,
  validateFields,
  validateFieldsAsync,
  resolveDisabled,
  resolveReadOnly,
  resolveOptions,
  validators,
  type ValidationResult,
} from '@dynamic-field-kit/core';
