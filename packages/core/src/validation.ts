import type { FieldDescription, Properties } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/** Effective disabled state: the static flag OR the dynamic condition. */
export function resolveDisabled(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): boolean {
  return (
    field.disabled === true || field.disabledCondition?.(data, rootData) === true
  );
}

/** Effective read-only state from the dynamic condition. */
export function resolveReadOnly(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): boolean {
  return field.readOnlyCondition?.(data, rootData) === true;
}

/** Run one field's validate hook; always returns an array (empty when valid). */
export function validateField(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties
): string[] {
  if (!field.validate) {
    return [];
  }
  const result = field.validate(value, data, rootData);
  if (!result) {
    return [];
  }
  return Array.isArray(result) ? result : [result];
}
