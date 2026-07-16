import { isFieldGroup } from './fieldGroup';
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
    field.disabled === true ||
    field.disabledCondition?.(data, rootData) === true
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

/**
 * Recursively validate `fields` against `data`, descending into repeatable
 * groups. Skips fields hidden by `appearCondition` or disabled (see
 * resolveDisabled); readOnly fields are still validated. Group error keys use
 * `${name}[${index}].${childName}`. `rootData` defaults to `data`.
 */
export function validateFields(
  fields: FieldDescription[],
  data: Properties,
  rootData: Properties = data
): ValidationResult {
  const errors: Record<string, string[]> = {};

  for (const field of fields) {
    if (field.appearCondition && !field.appearCondition(data, rootData)) {
      continue;
    }
    if (resolveDisabled(field, data, rootData)) {
      continue;
    }

    if (isFieldGroup(field)) {
      const items = Array.isArray(data[field.name])
        ? (data[field.name] as Properties[])
        : [];
      items.forEach((item, index) => {
        const sub = validateFields(field.fields, item, rootData);
        for (const [key, messages] of Object.entries(sub.errors)) {
          errors[`${field.name}[${index}].${key}`] = messages;
        }
      });
      continue;
    }

    const fieldErrors = validateField(field, data[field.name], data, rootData);
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
