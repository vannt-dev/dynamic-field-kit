import { isFieldGroup } from './fieldGroup';
import { isAsyncOptions } from './optionsLoader';
import type { FieldDescription, Properties, ValidationContext } from './types';

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
  /** True only when every applicable validator completed in this pass. */
  complete: boolean;
  /** Unambiguous summary; prefer this over combining `valid` and `pending`. */
  status: 'valid' | 'invalid' | 'pending';
}

/**
 * Options accepted by `validateFieldsAsync`. Today that is just the
 * validation context (the abort signal); the alias keeps the exported name
 * stable if the option bag grows.
 */
export type AsyncValidationOptions = ValidationContext;

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
    `[dynamic-field-kit] the validate hook for "${key}" is asynchronous. ` +
      `Submitting awaits it (handleSubmit uses validateFieldsAsync), but the ` +
      `live passes cannot: this field contributes nothing ` +
      `to the inline error shown while typing, nor to isValid/errors, so it ` +
      `reads as valid there until submit. Await validateFieldsAsync yourself ` +
      `if you need it sooner.`,
  );
}

const warnedUndeclaredAsyncOptions = new Set<string>();

/** Test-only. Clears the warn-once memo so each case starts from silence. */
export function __resetOptionsWarnings(): void {
  warnedUndeclaredAsyncOptions.clear();
}

function warnUndeclaredAsyncOptions(name: string): void {
  if (!isDev() || warnedUndeclaredAsyncOptions.has(name)) {
    return;
  }
  warnedUndeclaredAsyncOptions.add(name);
  console.warn(
    `[dynamic-field-kit] the options function for "${name}" returned a ` +
      `Promise, but the field is not declared async, so its options were ` +
      `dropped rather than handed to the renderer as a pending promise. ` +
      `Native async functions are detected automatically; a loader wrapped ` +
      `in a memoiser, a spy or a transpiler helper is not. Add ` +
      `\`optionsMode: 'async'\` to the field.`,
  );
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as PromiseLike<T>).then === 'function'
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isDeclaredAsync(field: FieldDescription): boolean {
  return (
    field.validationMode === 'async' ||
    field.validate?.constructor?.name === 'AsyncFunction'
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

/**
 * Resolves a static or synchronous options list.
 *
 * Returns undefined for a field whose options load asynchronously: those are
 * owned by `createOptionsLoader`, and calling the function here would hand the
 * renderer a Promise as its `options`.
 */
export function resolveOptions(
  field: FieldDescription,
  data: Properties,
  rootData?: Properties,
): Properties[] | undefined {
  if (!field.options || isAsyncOptions(field)) {
    return undefined;
  }
  if (typeof field.options === 'function') {
    const result = field.options(data, rootData);
    if (isPromiseLike<Properties[]>(result)) {
      // Detection missed it: `constructor.name` is not 'AsyncFunction' for a
      // loader wrapped in a memoiser, a spy, or a transpiler's helper. Handing
      // the renderer this promise as its option list would be worse than an
      // empty list, so drop it and say what to do about it.
      void Promise.resolve(result).catch(() => undefined);
      warnUndeclaredAsyncOptions(field.name);
      return undefined;
    }
    return result;
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
  context?: ValidationContext,
): { errors: string[]; isPending: boolean } {
  if (!field.validate) {
    return { errors: [], isPending: false };
  }
  if (isDeclaredAsync(field)) {
    // `validationMode: 'async'` is the developer saying they already know the
    // live pass cannot check this field, so there is nothing to warn about.
    if (field.validationMode !== 'async') {
      warnAsyncValidator(reportKey);
    }
    return { errors: [], isPending: true };
  }
  const result = field.validate(value, data, rootData, context);
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
  context?: ValidationContext,
): string[] {
  return runSyncValidate(field, value, data, rootData, field.name, context)
    .errors;
}

/** Run one field's validate hook asynchronously; always returns a Promise resolving to string[]. */
export async function validateFieldAsync(
  field: FieldDescription,
  value: unknown,
  data: Properties,
  rootData?: Properties,
  context?: ValidationContext,
): Promise<string[]> {
  if (!field.validate) {
    return [];
  }
  const result = await field.validate(value, data, rootData, context);
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
  context?: ValidationContext,
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
        const sub = validateFields(field.fields, item, rootData, context);
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
      field.name,
      context,
    );
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
    }
    if (isPending) {
      pending.push(field.name);
    }
  }

  const valid = Object.keys(errors).length === 0;
  const complete = pending.length === 0;
  return {
    valid,
    errors,
    // Omitted rather than empty so the common all-sync case keeps the shape it
    // has always had, and `pending` reads as "something needs awaiting".
    ...(pending.length > 0 ? { pending } : {}),
    complete,
    status: !valid ? 'invalid' : complete ? 'valid' : 'pending',
  };
}

/**
 * Recursively validate `fields` against `data` asynchronously, supporting Promise-based validation hooks.
 */
export async function validateFieldsAsync(
  fields: FieldDescription[],
  data: Properties,
  rootData: Properties = data,
  options: AsyncValidationOptions = {},
): Promise<ValidationResult> {
  const entries = await Promise.all(
    fields.map(async (field) => {
      if (field.appearCondition && !field.appearCondition(data, rootData)) {
        return [] as Array<[string, string[]]>;
      }
      if (resolveDisabled(field, data, rootData)) {
        return [] as Array<[string, string[]]>;
      }

      if (isFieldGroup(field)) {
        const items = Array.isArray(data[field.name])
          ? (data[field.name] as Properties[])
          : [];
        const itemEntries = await Promise.all(
          items.map(async (item, index) => {
            const sub = await validateFieldsAsync(
              field.fields,
              item,
              rootData,
              options,
            );
            return Object.entries(sub.errors).map(
              ([key, messages]) =>
                [`${field.name}[${index}].${key}`, messages] as [
                  string,
                  string[],
                ],
            );
          }),
        );
        return itemEntries.flat();
      }

      if (options.signal?.aborted) {
        return [] as Array<[string, string[]]>;
      }

      let fieldErrors: string[];
      try {
        fieldErrors = await validateFieldAsync(
          field,
          data[field.name],
          data,
          rootData,
          options,
        );
      } catch (error) {
        // A validator that honours the signal rejects with an AbortError. That
        // is this run being superseded, not a failure to report to the user -
        // rethrowing it here would reject the caller's handleSubmit.
        if (isAbortError(error)) {
          return [] as Array<[string, string[]]>;
        }
        throw error;
      }
      return fieldErrors.length > 0
        ? ([[field.name, fieldErrors]] as Array<[string, string[]]>)
        : [];
    }),
  );

  const errors = Object.fromEntries(entries.flat());
  const valid = Object.keys(errors).length === 0;
  // An aborted run checked only some of the fields, so it can never claim to
  // be complete - `valid: true` there means "nothing found before we stopped".
  const complete = options.signal?.aborted !== true;
  return {
    valid,
    errors,
    complete,
    status: !complete ? 'pending' : valid ? 'valid' : 'invalid',
  };
}

/**
 * Return the concrete leaf paths that currently exist in a form. Skips the
 * same fields validation skips (hidden by `appearCondition`, disabled), so a
 * caller marking every path touched cannot touch a field that can never hold
 * an error.
 */
export function collectFieldPaths(
  fields: FieldDescription[],
  data: Properties,
  rootData: Properties = data,
): string[] {
  return fields.flatMap((field) => {
    if (field.appearCondition && !field.appearCondition(data, rootData)) {
      return [];
    }
    if (resolveDisabled(field, data, rootData)) {
      return [];
    }
    if (isFieldGroup(field)) {
      const items = Array.isArray(data[field.name])
        ? (data[field.name] as Properties[])
        : [];
      return items.flatMap((item, index) =>
        collectFieldPaths(field.fields, item, rootData).map(
          (key) => `${field.name}[${index}].${key}`,
        ),
      );
    }
    return [field.name];
  });
}
