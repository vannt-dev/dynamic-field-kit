import { Properties } from './types';

export type FieldValidatorResult =
  string | string[] | undefined | Promise<string | string[] | undefined>;

export type FieldValidatorFunction = (
  value: unknown,
  data: Properties,
  rootData?: Properties,
) => FieldValidatorResult;

export interface SchemaValidatorOptions {
  /**
   * Name of the field this validator is attached to. Its live value is patched
   * into the form data before parsing, and only issues whose path points at
   * this field are surfaced.
   */
  field?: string;
  /**
   * What the schema describes:
   * - `'form'` (default) - an object schema covering the whole form; the form
   *   data object is parsed.
   * - `'field'` - a scalar schema covering one value (e.g. `z.string().email()`);
   *   the field's value is parsed on its own.
   */
  target?: 'form' | 'field';
}

/** Accepts the shorthand `zodValidator(schema, 'email')` or an options object. */
function normalizeOptions(
  fieldNameOrOptions?: string | SchemaValidatorOptions,
): Required<Pick<SchemaValidatorOptions, 'target'>> & { field?: string } {
  if (typeof fieldNameOrOptions === 'string') {
    return { field: fieldNameOrOptions, target: 'form' };
  }
  return {
    field: fieldNameOrOptions?.field,
    target: fieldNameOrOptions?.target ?? 'form',
  };
}

/**
 * Payload an adapter parses.
 *
 * For a `'form'` schema the form data object is parsed, with the field's live
 * `value` patched in when a field name is known, so cross-field rules still see
 * the rest of the form. For a `'field'` schema the value is parsed on its own.
 */
function buildPayload(
  data: Properties,
  value: unknown,
  field: string | undefined,
  target: 'form' | 'field',
): unknown {
  if (target === 'field') {
    return value;
  }
  return field ? { ...data, [field]: value } : data;
}

/** Keeps only the issues belonging to `fieldName`, then maps them to messages. */
function toMessages(
  issues: any[],
  fieldName: string | undefined,
  matchPath: (issue: any, fieldName: string) => boolean,
): string[] | undefined {
  const matched = fieldName
    ? issues.filter((issue) => matchPath(issue, fieldName))
    : issues;
  return matched.length === 0
    ? undefined
    : matched.map((issue: any) => issue.message);
}

/** Zod/Standard-Schema issue paths are arrays: `['address', 'street']`. */
function matchesArrayPath(issue: any, fieldName: string): boolean {
  return Array.isArray(issue.path) && issue.path.includes(fieldName);
}

/** Yup issue paths are strings: `'address.street'`. */
function matchesStringPath(issue: any, fieldName: string): boolean {
  return issue.path === fieldName;
}

function zodResultToMessages(
  res: any,
  fieldName?: string,
): string[] | undefined {
  if (res.success) {
    return undefined;
  }
  const issues = res.error?.issues || res.error?.errors || [];
  return toMessages(issues, fieldName, matchesArrayPath);
}

/**
 * Validates whole form data or a specific field using a Zod schema.
 *
 * Parses synchronously so the result is usable by the synchronous
 * `validateFields`. Schemas containing async refinements cannot be parsed
 * synchronously - for those, a Promise is returned and you must validate via
 * `validateFieldsAsync`.
 */
export function zodValidator(
  schema: any,
  fieldNameOrOptions?: string | SchemaValidatorOptions,
): FieldValidatorFunction {
  const { field, target } = normalizeOptions(fieldNameOrOptions);
  // A scalar schema reports issues with an empty path, so there is nothing to
  // filter by - every issue belongs to this field.
  const filterBy = target === 'field' ? undefined : field;

  return (value: unknown, data: Properties) => {
    const payload = buildPayload(data, value, field, target);

    if (typeof schema.safeParse === 'function') {
      try {
        return zodResultToMessages(schema.safeParse(payload), filterBy);
      } catch {
        // Zod throws when the schema needs async parsing; fall through.
      }
    }

    if (typeof schema.safeParseAsync === 'function') {
      return schema
        .safeParseAsync(payload)
        .then((res: any) => zodResultToMessages(res, filterBy));
    }

    return undefined;
  };
}

/** A Yup ValidationError, as opposed to Yup's "test returned a Promise" error. */
function isYupValidationError(err: any): boolean {
  return err?.name === 'ValidationError' || Array.isArray(err?.inner);
}

function yupErrorToMessages(
  err: any,
  fieldName?: string,
): string[] | undefined {
  if (Array.isArray(err.inner) && err.inner.length > 0) {
    return toMessages(err.inner, fieldName, matchesStringPath);
  }
  if (fieldName && err.path !== undefined && err.path !== fieldName) {
    return undefined;
  }
  return err.message ? [err.message] : undefined;
}

/**
 * Validates whole form data or a specific field using a Yup schema.
 *
 * Validates synchronously so the result is usable by the synchronous
 * `validateFields`. Schemas with async `.test()` rules cannot be validated
 * synchronously - for those, a Promise is returned and you must validate via
 * `validateFieldsAsync`.
 */
export function yupValidator(
  schema: any,
  fieldNameOrOptions?: string | SchemaValidatorOptions,
): FieldValidatorFunction {
  const { field, target } = normalizeOptions(fieldNameOrOptions);
  const filterBy = target === 'field' ? undefined : field;

  return (value: unknown, data: Properties) => {
    const payload = buildPayload(data, value, field, target);

    if (typeof schema.validateSync === 'function') {
      try {
        schema.validateSync(payload, { abortEarly: false });
        return undefined;
      } catch (err: any) {
        if (isYupValidationError(err)) {
          return yupErrorToMessages(err, filterBy);
        }
        // Not a ValidationError: Yup throws a plain Error when a test is
        // async. Retry asynchronously so that internal message never reaches
        // the user - but only if there is an async path to retry on.
        if (typeof schema.validate !== 'function') {
          return yupErrorToMessages(err, filterBy);
        }
      }
    }

    if (typeof schema.validate === 'function') {
      return schema
        .validate(payload, { abortEarly: false })
        .then(() => undefined)
        .catch((err: any) => yupErrorToMessages(err, filterBy));
    }

    return undefined;
  };
}

function standardResultToMessages(
  result: any,
  fieldName?: string,
): string[] | undefined {
  if (!result.issues || result.issues.length === 0) {
    return undefined;
  }
  return toMessages(result.issues, fieldName, matchesArrayPath);
}

/**
 * Validates whole form data or a specific field using a Valibot or
 * Standard-Schema compatible object.
 */
export function standardSchemaValidator(
  schema: any,
  fieldNameOrOptions?: string | SchemaValidatorOptions,
): FieldValidatorFunction {
  const { field, target } = normalizeOptions(fieldNameOrOptions);
  const filterBy = target === 'field' ? undefined : field;

  return (value: unknown, data: Properties) => {
    const payload = buildPayload(data, value, field, target);
    const std = schema['~standard'] || schema;

    if (typeof std.validate !== 'function') {
      return undefined;
    }

    const result = std.validate(payload);
    return result instanceof Promise
      ? result.then((res: any) => standardResultToMessages(res, filterBy))
      : standardResultToMessages(result, filterBy);
  };
}

export const valibotValidator = standardSchemaValidator;
