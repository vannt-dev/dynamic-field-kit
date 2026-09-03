import { isFieldGroup } from './fieldGroup';
import type { FieldDescription, Properties } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  /**
   * Fields whose `validate` hook returned a Promise, keyed exactly like
   * `errors` (so a grouped field reads `contacts[0].username`). The sync pass
   * cannot await, so it neither found nor ruled out an error for these - a
   * `valid: true` alongside a non-empty `pending` means "nothing wrong that
   * could be checked synchronously", not "valid".
   *
   * Left undefined when every validator resolved synchronously, which is the
   * common case, and always undefined from `validateFieldsAsync` - it awaits
   * everything, so nothing is left pending.
   */
  pending?: string[];
}

function isDev(): boolean {
  return (
    typeof process !== 'undefined' &&
    !!process.env &&
    process.env.NODE_ENV !== 'production'
  );
}

// Warn at most once per field name. `validateFields` runs on every keystroke
// through MultiFieldInput's validity reporting, and a warning per keystroke
// would be worse than the silence it replaces.
const warnedAsyncFields = new Set<string>();

function warnAsyncValidator(key: string): void {
  if (!isDev() || warnedAsyncFields.has(key)) {
    return;
  }
  warnedAsyncFields.add(key);
  console.warn(
    `[dynamic-field-kit] the validate hook for "${key}" returned a Promise. ` +
      `Submitting awaits it (handleSubmit uses validateFieldsAsync), but the ` +
      `live passes cannot: this field contributes nothing ` +
      `to the inline error shown while typing, nor to isValid/errors, so it ` +
      `reads as valid there until submit. Await validateFieldsAsync yourself ` +
      `if you need it sooner.`,
  );
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as PromiseLike<T>).then === 'function'
  );
}

/** Effective disabled state: the static flag OR the dynamic condition. */
export function resolveDisabled(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties,
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
  rootData?: Properties,
): boolean {
  return field.readOnlyCondition?.(data, rootData) === true;
}

/** Resolves dynamic options or returns static options list. */
export function resolveOptions(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties,
): Properties[] | undefined {
  if (!field.options) {
    return undefined;
  }
  if (typeof field.options === 'function') {
    return field.options(data, rootData);
  }
  return field.options;
}

/**
 * The sync validate pass, plus whether the hook returned a Promise this pass
 * could not await. `validateField` hides that second half for callers that only
 * want messages; `validateFields` needs it to fill in `ValidationResult.pending`.
 */
function runSyncValidate(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData: Properties | undefined,
  /** Key to report this field under - a grouped field is not just `name`. */
  reportKey = field.name,
): { errors: string[]; isPending: boolean } {
  if (!field.validate) {
    return { errors: [], isPending: false };
  }
  const result = field.validate(value, data, rootData);
  if (isPromiseLike<string | string[] | undefined>(result)) {
    // A rejected async result has no observer on the synchronous path. Attach
    // one so live validation does not create an unhandled rejection; callers
    // that need the result run the validator again through the async API.
    void Promise.resolve(result).catch(() => undefined);
    warnAsyncValidator(reportKey);
    return { errors: [], isPending: true };
  }
  if (!result) {
    return { errors: [], isPending: false };
  }
  return {
    errors: Array.isArray(result) ? result : [result],
    isPending: false,
  };
}

/** Run one field's validate hook; always returns an array (empty when valid). Synchronous. */
export function validateField(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties,
): string[] {
  return runSyncValidate(field, value, data, rootData).errors;
}

/** Run one field's validate hook asynchronously; always returns a Promise resolving to string[]. */
export async function validateFieldAsync(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties,
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
  rootData: Properties = data,
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const pending: string[] = [];

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
        for (const key of sub.pending ?? []) {
          pending.push(`${field.name}[${index}].${key}`);
        }
      });
      continue;
    }

    const { errors: fieldErrors, isPending } = runSyncValidate(
      field,
      data[field.name],
      data,
      rootData,
    );
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
    if (isPending) {
      pending.push(field.name);
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    // Omitted rather than empty so the common all-sync case keeps the shape it
    // has always had, and `pending` reads as "something needs awaiting".
    ...(pending.length > 0 ? { pending } : {}),
  };
}

/**
 * Recursively validate `fields` against `data` asynchronously, supporting Promise-based validation hooks.
 */
export async function validateFieldsAsync(
  fields: FieldDescription[],
  data: Properties,
  rootData: Properties = data,
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
          rootData,
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
      rootData,
    );
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
