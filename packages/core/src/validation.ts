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

/** Resolves dynamic options or returns static options list. */
export function resolveOptions(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties
): Properties[] | undefined {
  if (!field.options) {
    return undefined;
  }
  if (typeof field.options === 'function') {
    return field.options(data, rootData);
  }
  return field.options;
}

/** Run one field's validate hook; always returns an array (empty when valid). Synchronous. */
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
  if (!result || result instanceof Promise) {
    return [];
  }
  return Array.isArray(result) ? result : [result];
}

/** Run one field's validate hook asynchronously; always returns a Promise resolving to string[]. */
export async function validateFieldAsync(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties
): Promise<string[]> {
  if (!field.validate) {
    return [];
  }
  const result = await field.validate(value, data, rootData);
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

/**
 * Recursively validate `fields` against `data` asynchronously, supporting Promise-based validation hooks.
 */
export async function validateFieldsAsync(
  fields: FieldDescription[],
  data: Properties,
  rootData: Properties = data
): Promise<ValidationResult> {
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
      for (let index = 0; index < items.length; index++) {
        const sub = await validateFieldsAsync(
          field.fields,
          items[index],
          rootData
        );
        for (const [key, messages] of Object.entries(sub.errors)) {
          errors[`${field.name}[${index}].${key}`] = messages;
        }
      }
      continue;
    }

    const fieldErrors = await validateFieldAsync(
      field,
      data[field.name],
      data,
      rootData
    );
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Helper to adapt a Zod schema to a FieldDescription validate function.
 */
export function zodValidator(
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      error?: {
        errors: Array<{ message: string; path: Array<string | number> }>;
      };
    };
  },
  fieldName?: string
): (value: unknown, data: Properties) => string | string[] | undefined {
  return (value: unknown, data: Properties) => {
    const target = fieldName ? data || {} : value;
    const result = schema.safeParse(target);
    if (result.success || !result.error) {
      return undefined;
    }
    const matchingErrors = fieldName
      ? result.error.errors
          .filter(
            (err) =>
              err.path.join('.') === fieldName || err.path[0] === fieldName
          )
          .map((err) => err.message)
      : result.error.errors.map((err) => err.message);

    return matchingErrors.length > 0 ? matchingErrors : undefined;
  };
}

/**
 * Helper to adapt a Yup schema to a FieldDescription validate function.
 */
export function yupValidator(
  schema: { validateSync: (value: unknown, opts?: unknown) => unknown },
  fieldName?: string
): (value: unknown, data: Properties) => string | string[] | undefined {
  return (value: unknown, data: Properties) => {
    try {
      const target = fieldName ? data || {} : value;
      schema.validateSync(target, { abortEarly: false });
      return undefined;
    } catch (err: unknown) {
      const yupErr = err as {
        inner?: Array<{ path?: string; message: string }>;
        message?: string;
      };
      if (yupErr.inner && yupErr.inner.length > 0) {
        const matching = fieldName
          ? yupErr.inner
              .filter((e) => e.path === fieldName)
              .map((e) => e.message)
          : yupErr.inner.map((e) => e.message);
        return matching.length > 0 ? matching : undefined;
      }
      return yupErr.message ? [yupErr.message] : undefined;
    }
  };
}
