import {
  applyComputedValues,
  collectFieldPaths,
  createMessageResolver,
  FieldDescription,
  type MessageCatalog,
  Properties,
  type ValidationContext,
  type ValidationResult,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import {
  type FieldErrors,
  mergeFieldErrors,
  type ServerErrorsInput,
  toFieldErrors,
  withoutChangedFields,
  withoutField,
} from './serverErrors';

export interface UseDynamicFormOptions {
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

export function useDynamicForm({
  fields,
  initialValues = {},
  validateOnBlur = true,
  validateOnChange = false,
  messages,
}: UseDynamicFormOptions) {
  const validationContext: ValidationContext = {
    t: createMessageResolver(messages),
  };
  const data = ref<Properties>(applyComputedValues(fields, initialValues));
  // The baseline `dirty` is measured against: the initialValues option until
  // reset(newValues) replaces it. Distinct from that option, which never
  // changes. See the React adapter for the full rationale.
  const baselineValues = ref<Properties>({ ...data.value });
  const ownErrors = ref<Record<string, string[]>>({});
  // What the server refused, by field path. Shown through `errors`, after a
  // field's own errors.
  const serverErrors = ref<FieldErrors>({});
  // Still writable, as the plain ref it used to be: a write sets the form's
  // own errors and leaves the server's alone.
  const errors = computed<Record<string, string[]>>({
    get: () => mergeFieldErrors(ownErrors.value, serverErrors.value),
    set: (value) => {
      ownErrors.value = value;
    },
  });
  const isDirty = ref<boolean>(false);
  const touched = ref<Record<string, boolean>>({});
  const isSubmitting = ref<boolean>(false);
  const isSubmitted = ref<boolean>(false);
  const initialValidation = validateFields(
    fields,
    data.value,
    undefined,
    validationContext,
  );
  const validationResult = ref<ValidationResult>(initialValidation);
  const isValidating = ref(false);
  let validationRun = 0;
  let validationController: AbortController | undefined;
  // A submit gets its own run counter and controller. Typing aborts the live
  // validation run, and a submit must not be collateral damage of that.
  let submitRun = 0;
  let submitController: AbortController | undefined;

  // Cancel whatever is still in flight when the owning component (or effect
  // scope) goes away, so an unmounted form stops holding a request open. The
  // guard is for calling this composable outside a scope, which the tests do
  // and which onScopeDispose would otherwise warn about.
  if (getCurrentScope()) {
    onScopeDispose(() => {
      validationController?.abort();
      submitController?.abort();
    });
  }

  const isValid = computed(() => validationResult.value.valid);
  const isValidationComplete = computed(
    () => validationResult.value.complete && !isValidating.value,
  );
  const validationStatus = computed<ValidationResult['status']>(() =>
    isValidating.value ? 'pending' : validationResult.value.status,
  );

  function commitSyncResult(res: ValidationResult) {
    validationResult.value = res;
    return res.valid;
  }

  function validate() {
    const res = validateFields(
      fields,
      data.value,
      undefined,
      validationContext,
    );
    errors.value = res.errors;
    return commitSyncResult(res);
  }

  async function validateAsync() {
    const run = ++validationRun;
    validationController?.abort();
    const controller = new AbortController();
    validationController = controller;
    const snapshot = data.value;
    isValidating.value = true;
    try {
      const res = await validateFieldsAsync(fields, snapshot, snapshot, {
        ...validationContext,
        signal: controller.signal,
      });
      if (run !== validationRun || data.value !== snapshot) {
        return res.valid;
      }
      errors.value = res.errors;
      validationResult.value = res;
      return res.valid;
    } finally {
      if (run === validationRun) {
        isValidating.value = false;
      }
    }
  }

  function handleChange(newData: Properties) {
    const next = applyComputedValues(fields, newData);
    // The server judged the old value: its verdict goes with it.
    serverErrors.value = withoutChangedFields(
      serverErrors.value,
      data.value,
      next,
    );
    data.value = next;
    isDirty.value = true;
    validationController?.abort();
    validationRun += 1;
    isValidating.value = false;

    const res = validateFields(fields, next, undefined, validationContext);
    commitSyncResult(res);

    if (validateOnChange) {
      errors.value = res.errors;
    }
  }

  function setFieldValue(name: string, value: unknown) {
    handleChange({ ...data.value, [name]: value });
  }

  function setFieldTouched(name: string, isTouched = true) {
    touched.value = { ...touched.value, [name]: isTouched };
  }

  /**
   * Marks every field touched at once. `handleSubmit` calls this for you, so
   * an invalid submit surfaces errors on fields the user never focused - bind
   * `touched` on `MultiFieldInput` for it to take effect.
   */
  function touchAll() {
    touched.value = Object.fromEntries(
      collectFieldPaths(fields, data.value).map(
        (path) => [path, true] as const,
      ),
    );
  }

  /** Clears the touched map without touching data, errors or dirty state. */
  function getDirtyValues(): Properties {
    const baseline = baselineValues.value;
    const current = data.value;
    const dirty: Properties = {};
    for (const key of Object.keys(current)) {
      if (!Object.is(current[key], baseline[key])) {
        dirty[key] = current[key];
      }
    }
    return dirty;
  }

  function resetTouched() {
    touched.value = {};
  }

  /**
   * Shows the errors a backend answered with, and marks their fields touched
   * so they are displayed. An error stays until the value it was about
   * changes, until `clearServerErrors` or `reset`, or until the next submit.
   * `isValid` is not affected: it speaks for the form's own rules. Core's
   * `serverErrorsFrom(body)` turns the usual response shapes into this map.
   */
  function setServerErrors(input: ServerErrorsInput) {
    const next = toFieldErrors(input);
    serverErrors.value = next;
    touched.value = {
      ...touched.value,
      ...Object.fromEntries(Object.keys(next).map((path) => [path, true])),
    };
  }

  /** Removes the server errors of one field, or all of them. */
  function clearServerErrors(name?: string) {
    if (name === undefined) {
      serverErrors.value = {};
      return;
    }
    if (name in serverErrors.value) {
      serverErrors.value = withoutField(serverErrors.value, name);
    }
  }

  function handleBlur(fieldName: string) {
    setFieldTouched(fieldName, true);
    if (validateOnBlur) {
      const res = validateFields(
        fields,
        data.value,
        undefined,
        validationContext,
      );
      errors.value = res.errors;
      commitSyncResult(res);
    }
  }

  function reset(newValues?: Properties) {
    const seed = newValues ?? initialValues;
    const next = applyComputedValues(fields, seed);
    data.value = next;
    baselineValues.value = { ...next };
    errors.value = {};
    serverErrors.value = {};
    isDirty.value = false;
    touched.value = {};
    isSubmitting.value = false;
    isSubmitted.value = false;
    validationController?.abort();
    validationRun += 1;
    isValidating.value = false;
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
      isSubmitting.value = true;
      // A new attempt: what the server said about the last one is history.
      serverErrors.value = {};
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
        const snapshot = data.value;
        isValidating.value = true;
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
        if (data.value === snapshot && run === validationRun) {
          errors.value = res.errors;
          validationResult.value = res;
        } else {
          const live = validateFields(
            fields,
            data.value,
            undefined,
            validationContext,
          );
          errors.value = live.errors;
          validationResult.value = live;
        }
        isSubmitted.value = true;
        if (res.valid) {
          await onValid(snapshot);
        } else if (onInvalid) {
          onInvalid(res.errors);
        }
      } finally {
        if (thisSubmit === submitRun) {
          isValidating.value = false;
        }
        isSubmitting.value = false;
      }
    };
  }

  return {
    data,
    errors,
    isValid,
    isValidating,
    isValidationComplete,
    validationStatus,
    isDirty,
    baselineValues,
    getDirtyValues,
    touched,
    isSubmitting,
    isSubmitted,
    setFieldValue,
    setFieldTouched,
    touchAll,
    resetTouched,
    handleChange,
    handleBlur,
    reset,
    validate,
    validateAsync,
    serverErrors,
    setServerErrors,
    clearServerErrors,
    handleSubmit,
  };
}
