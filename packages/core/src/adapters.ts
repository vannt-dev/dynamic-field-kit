import { Properties } from './types';

export type FieldValidatorResult =
  | string
  | string[]
  | undefined
  | Promise<string | string[] | undefined>;

export type FieldValidatorFunction = (
  value: unknown,
  data: Properties,
  rootData?: Properties
) => FieldValidatorResult;

/**
 * Validates whole form data or a specific field using a Zod schema.
 */
export function zodValidator(
  schema: any,
  fieldName?: string
): FieldValidatorFunction {
  return (value: unknown, data: Properties) => {
    const payload = fieldName
      ? { ...data, [fieldName]: value }
      : value !== undefined
      ? value
      : data;

    if (typeof schema.safeParseAsync === 'function') {
      return schema.safeParseAsync(payload).then((res: any) => {
        if (res.success) {
          return undefined;
        }
        const issues = res.error?.issues || res.error?.errors || [];
        const matched = fieldName
          ? issues.filter(
              (i: any) => Array.isArray(i.path) && i.path.includes(fieldName)
            )
          : issues;
        if (matched.length === 0) {
          return undefined;
        }
        return matched.map((i: any) => i.message);
      });
    }

    if (typeof schema.safeParse === 'function') {
      const res = schema.safeParse(payload);
      if (res.success) {
        return undefined;
      }
      const issues = res.error?.issues || res.error?.errors || [];
      const matched = fieldName
        ? issues.filter(
            (i: any) => Array.isArray(i.path) && i.path.includes(fieldName)
          )
        : issues;
      if (matched.length === 0) {
        return undefined;
      }
      return matched.map((i: any) => i.message);
    }

    return undefined;
  };
}

/**
 * Validates whole form data or a specific field using a Yup schema.
 */
export function yupValidator(
  schema: any,
  fieldName?: string
): FieldValidatorFunction {
  return (value: unknown, data: Properties) => {
    const payload = fieldName
      ? { ...data, [fieldName]: value }
      : value !== undefined
      ? value
      : data;

    try {
      if (typeof schema.validateSync === 'function') {
        schema.validateSync(payload, { abortEarly: false });
        return undefined;
      }
    } catch (err: any) {
      if (err.inner && Array.isArray(err.inner)) {
        const matched = fieldName
          ? err.inner.filter((i: any) => i.path === fieldName)
          : err.inner;
        if (matched.length === 0) {
          return undefined;
        }
        return matched.map((i: any) => i.message);
      }
      return err.message ? [err.message] : undefined;
    }

    if (typeof schema.validate === 'function') {
      return schema
        .validate(payload, { abortEarly: false })
        .then(() => undefined)
        .catch((err: any) => {
          if (err.inner && Array.isArray(err.inner)) {
            const matched = fieldName
              ? err.inner.filter((i: any) => i.path === fieldName)
              : err.inner;
            if (matched.length === 0) {
              return undefined;
            }
            return matched.map((i: any) => i.message);
          }
          return err.message ? [err.message] : undefined;
        });
    }

    return undefined;
  };
}

/**
 * Validates whole form data or a specific field using a Valibot or Standard-Schema compatible object.
 */
export function standardSchemaValidator(
  schema: any,
  fieldName?: string
): FieldValidatorFunction {
  return (value: unknown, data: Properties) => {
    const payload = fieldName ? { ...data, [fieldName]: value } : data;
    const std = schema['~standard'] || schema;
    if (typeof std.validate === 'function') {
      const result = std.validate(payload);
      if (result instanceof Promise) {
        return result.then((res: any) => {
          if (!res.issues || res.issues.length === 0) {
            return undefined;
          }
          const matched = fieldName
            ? res.issues.filter(
                (i: any) => Array.isArray(i.path) && i.path.includes(fieldName)
              )
            : res.issues;
          if (matched.length === 0) {
            return undefined;
          }
          return matched.map((i: any) => i.message);
        });
      }
      if (!result.issues || result.issues.length === 0) {
        return undefined;
      }
      const matched = fieldName
        ? result.issues.filter(
            (i: any) => Array.isArray(i.path) && i.path.includes(fieldName)
          )
        : result.issues;
      if (matched.length === 0) {
        return undefined;
      }
      return matched.map((i: any) => i.message);
    }
    return undefined;
  };
}

export const valibotValidator = standardSchemaValidator;
