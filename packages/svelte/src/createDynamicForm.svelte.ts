import {
  applyComputedValues,
  collectFieldPaths,
  createMessageResolver,
  type FieldDescription,
  type MessageCatalog,
  type Properties,
  type ValidationContext,
  type ValidationResult,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { onDestroy } from 'svelte';

export interface CreateDynamicFormOptions {
  fields: FieldDescription[];
  initialValues?: Properties;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  /**
   * Messages for the built-in validators, set once for the whole form instead
   * of per field. A message passed directly to a validator still wins, and any
   * key omitted here falls back to the validator's English default. See core's
   * `MessageCatalog`.
   */
  messages?: MessageCatalog;
}

/**
 * Form state for a list of fields: values, errors, touched and dirty flags,
 * validation and submit handling.
 *
 * The same shape as the `useDynamicForm` of the other adapters, with one
 * Svelte difference: the state is read as plain properties (`form.data`,
 * `form.errors`), which are reactive wherever Svelte tracks reads - a
 * template, a `$derived`, an `$effect`. Do not destructure them
 * (`const { data } = form` takes a snapshot); the functions can be
 * destructured freely.
 */
export function createDynamicForm({
  fields,
  initialValues = {},
  validateOnBlur = true,
  validateOnChange = false,
  messages,
}: CreateDynamicFormOptions) {
  const validationContext: ValidationContext = {
    t: createMessageResolver(messages),
  };
  // Raw state throughout: every update replaces the object, which is what lets
  // `MultiFieldInput` and the stale-result checks below compare by identity.
  const initial = applyComputedValues(fields, initialValues);
  let data = $state.raw<Properties>(initial);
  // The baseline `dirty` is measured against: the initialValues option until
  // reset(newValues) replaces it. Distinct from that option, which never
  // changes. See the React adapter for the full rationale.
  let baselineValues = $state.raw<Properties>({ ...initial });
  let errors = $state.raw<Record<string, string[]>>({});
  let isDirty = $state(false);
  let touched = $state.raw<Record<string, boolean>>({});
  let isSubmitting = $state(false);
  let isSubmitted = $state(false);
  let validationResult = $state.raw<ValidationResult>(
    validateFields(fields, initial, undefined, validationContext),
  );
  let isValidating = $state(false);
  let validationRun = 0;
  let validationController: AbortController | undefined;
  // A submit gets its own run counter and controller. Typing aborts the live
  // validation run, and a submit must not be collateral damage of that.
  let submitRun = 0;
  let submitController: AbortController | undefined;

  /** Cancels whatever validation or submit is still in flight. */
  function destroy() {
    validationController?.abort();
    submitController?.abort();
  }

  // Cancel in-flight work when the owning component goes away, so an unmounted
  // form stops holding a request open. Outside a component there is nothing to
  // hook into - `onDestroy` throws there - and the caller owns `destroy()`.
  try {
    onDestroy(destroy);
  } catch {
    // Created outside component initialisation, which the tests do.
  }

  function commitSyncResult(res: ValidationResult) {
    validationResult = res;
    return res.valid;
  }

  function validate() {
    const res = validateFields(fields, data, undefined, validationContext);
    errors = res.errors;
    return commitSyncResult(res);
  }

  async function validateAsync() {
    const run = ++validationRun;
    validationController?.abort();
    const controller = new AbortController();
    validationController = controller;
    const snapshot = data;
    isValidating = true;
    try {
      const res = await validateFieldsAsync(fields, snapshot, snapshot, {
        ...validationContext,
        signal: controller.signal,
      });
      if (run !== validationRun || data !== snapshot) {
        return res.valid;
      }
      errors = res.errors;
      validationResult = res;
      return res.valid;
    } finally {
      if (run === validationRun) {
        isValidating = false;
      }
    }
  }

  function handleChange(newData: Properties) {
    const next = applyComputedValues(fields, newData);
    data = next;
    isDirty = true;
    validationController?.abort();
    validationRun += 1;
    isValidating = false;

    const res = validateFields(fields, next, undefined, validationContext);
    commitSyncResult(res);

    if (validateOnChange) {
      errors = res.errors;
    }
  }

  function setFieldValue(name: string, value: unknown) {
    handleChange({ ...data, [name]: value });
  }

  function setFieldTouched(name: string, isTouched = true) {
    touched = { ...touched, [name]: isTouched };
  }

  /**
   * Marks every field touched at once. `handleSubmit` calls this for you, so
   * an invalid submit surfaces errors on fields the user never focused.
   */
  function touchAll() {
    touched = Object.fromEntries(
      collectFieldPaths(fields, data).map((path) => [path, true] as const),
    );
  }

  /** The values that differ from the baseline, by top-level key. */
  function getDirtyValues(): Properties {
    const dirty: Properties = {};
    for (const key of Object.keys(data)) {
      if (!Object.is(data[key], baselineValues[key])) {
        dirty[key] = data[key];
      }
    }
    return dirty;
  }

  /** Clears the touched map without touching data, errors or dirty state. */
  function resetTouched() {
    touched = {};
  }

  function handleBlur(fieldName: string) {
    setFieldTouched(fieldName, true);
    if (validateOnBlur) {
      const res = validateFields(fields, data, undefined, validationContext);
      errors = res.errors;
      commitSyncResult(res);
    }
  }

  function reset(newValues?: Properties) {
    const next = applyComputedValues(fields, newValues ?? initialValues);
    data = next;
    baselineValues = { ...next };
    errors = {};
    isDirty = false;
    touched = {};
    isSubmitting = false;
    isSubmitted = false;
    validationController?.abort();
    validationRun += 1;
    isValidating = false;
    commitSyncResult(
      validateFields(fields, next, undefined, validationContext),
    );
  }

  function handleSubmit(
    onValid: (data: Properties) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void,
  ) {
    return async (e?: Event) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      isSubmitting = true;
      const thisSubmit = ++submitRun;
      try {
        // Touch everything before validating: a submit is the user asserting
        // the form is finished, so a field they never focused should still
        // show its error. Without this, submitting an untouched form appears
        // to do nothing at all.
        touchAll();
        const run = ++validationRun;
        // Cancel any live run so its (older) result cannot land on top of this
        // one, but validate under a controller of the submit's own.
        validationController?.abort();
        submitController?.abort();
        const controller = new AbortController();
        submitController = controller;
        const snapshot = data;
        isValidating = true;
        const res = await validateFieldsAsync(fields, snapshot, snapshot, {
          ...validationContext,
          signal: controller.signal,
        });
        if (thisSubmit !== submitRun) {
          return;
        }
        // Editing during the submit does not cancel it - the user submitted
        // this snapshot and is owed an answer for it. What the form *shows*
        // still has to describe the data on screen, so when it moved on, the
        // displayed state is re-derived instead of showing the old pass.
        if (data === snapshot && run === validationRun) {
          errors = res.errors;
          validationResult = res;
        } else {
          const live = validateFields(
            fields,
            data,
            undefined,
            validationContext,
          );
          errors = live.errors;
          validationResult = live;
        }
        isSubmitted = true;
        if (res.valid) {
          await onValid(snapshot);
        } else if (onInvalid) {
          onInvalid(res.errors);
        }
      } finally {
        if (thisSubmit === submitRun) {
          isValidating = false;
        }
        isSubmitting = false;
      }
    };
  }

  return {
    get data() {
      return data;
    },
    get errors() {
      return errors;
    },
    get isValid() {
      return validationResult.valid;
    },
    get isValidating() {
      return isValidating;
    },
    get isValidationComplete() {
      return validationResult.complete && !isValidating;
    },
    get validationStatus(): ValidationResult['status'] {
      return isValidating ? 'pending' : validationResult.status;
    },
    get isDirty() {
      return isDirty;
    },
    get baselineValues() {
      return baselineValues;
    },
    get touched() {
      return touched;
    },
    get isSubmitting() {
      return isSubmitting;
    },
    get isSubmitted() {
      return isSubmitted;
    },
    getDirtyValues,
    setFieldValue,
    setFieldTouched,
    touchAll,
    resetTouched,
    handleChange,
    handleBlur,
    reset,
    validate,
    validateAsync,
    handleSubmit,
    destroy,
  };
}

/** What `createDynamicForm` returns. */
export type DynamicForm = ReturnType<typeof createDynamicForm>;
