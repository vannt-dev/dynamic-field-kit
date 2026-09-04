import { computed, signal } from '@angular/core';
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

export interface DynamicFormOptions {
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

export function createDynamicFormStore(options: DynamicFormOptions) {
  const fields = options.fields;
  const initialValues = options.initialValues || {};
  const validateOnBlur = options.validateOnBlur ?? true;
  const validateOnChange = options.validateOnChange ?? false;
  const validationContext: ValidationContext = {
    t: createMessageResolver(options.messages),
  };

  const data = signal<Properties>(applyComputedValues(fields, initialValues));
  // The baseline `dirty` is measured against: the initialValues option until
  // reset(newValues) replaces it. Distinct from that option, which never
  // changes. See the React adapter for the full rationale.
  const baselineValues = signal<Properties>({ ...data() });
  const errors = signal<Record<string, string[]>>({});
  const isDirty = signal<boolean>(false);
  const touched = signal<Record<string, boolean>>({});
  const isSubmitting = signal<boolean>(false);
  const isSubmitted = signal<boolean>(false);
  const validationResult = signal<ValidationResult>(
    validateFields(fields, data(), undefined, validationContext),
  );
  const isValidating = signal(false);
  let validationRun = 0;
  let validationController: AbortController | undefined;
  // A submit gets its own run counter and controller. Typing aborts the live
  // validation run, and a submit must not be collateral damage of that.
  let submitRun = 0;
  let submitController: AbortController | undefined;

  const isValid = computed(() => validationResult().valid);
  const isValidationComplete = computed(
    () => validationResult().complete && !isValidating(),
  );
  const validationStatus = computed<ValidationResult['status']>(() =>
    isValidating() ? 'pending' : validationResult().status,
  );

  function commitSyncResult(res: ValidationResult): boolean {
    validationResult.set(res);
    return res.valid;
  }

  function validate(): boolean {
    const res = validateFields(fields, data(), undefined, validationContext);
    errors.set(res.errors);
    return commitSyncResult(res);
  }

  async function validateAsync(): Promise<boolean> {
    const run = ++validationRun;
    validationController?.abort();
    const controller = new AbortController();
    validationController = controller;
    const snapshot = data();
    isValidating.set(true);
    try {
      const res = await validateFieldsAsync(fields, snapshot, snapshot, {
        ...validationContext,
        signal: controller.signal,
      });
      if (run !== validationRun || data() !== snapshot) {
        return res.valid;
      }
      errors.set(res.errors);
      validationResult.set(res);
      return res.valid;
    } finally {
      if (run === validationRun) {
        isValidating.set(false);
      }
    }
  }

  function handleChange(newData: Properties) {
    const next = applyComputedValues(fields, newData);
    data.set(next);
    isDirty.set(true);
    validationController?.abort();
    validationRun += 1;
    isValidating.set(false);

    const res = validateFields(fields, next, undefined, validationContext);
    commitSyncResult(res);

    if (validateOnChange) {
      errors.set(res.errors);
    }
  }

  function setFieldValue(name: string, value: unknown) {
    handleChange({ ...data(), [name]: value });
  }

  function setFieldTouched(name: string, isTouched = true) {
    touched.set({ ...touched(), [name]: isTouched });
  }

  /**
   * Marks every field touched at once. `handleSubmit` calls this for you, so
   * an invalid submit surfaces errors on fields the user never focused - bind
   * `[touched]` on `<dfk-multi-field-input>` for it to take effect.
   */
  function touchAll() {
    touched.set(
      Object.fromEntries(
        collectFieldPaths(fields, data()).map((path) => [path, true] as const),
      ),
    );
  }

  /** Clears the touched map without touching data, errors or dirty state. */
  function getDirtyValues(): Properties {
    const baseline = baselineValues();
    const current = data();
    const dirty: Properties = {};
    for (const key of Object.keys(current)) {
      if (!Object.is(current[key], baseline[key])) {
        dirty[key] = current[key];
      }
    }
    return dirty;
  }

  function resetTouched() {
    touched.set({});
  }

  function handleBlur(fieldName: string) {
    setFieldTouched(fieldName, true);
    if (validateOnBlur) {
      const res = validateFields(fields, data(), undefined, validationContext);
      errors.set(res.errors);
      commitSyncResult(res);
    }
  }

  function reset(newValues?: Properties) {
    const seed = newValues ?? initialValues;
    const next = applyComputedValues(fields, seed);
    data.set(next);
    baselineValues.set({ ...next });
    errors.set({});
    isDirty.set(false);
    touched.set({});
    isSubmitting.set(false);
    isSubmitted.set(false);
    validationController?.abort();
    validationRun += 1;
    isValidating.set(false);
    commitSyncResult(
      validateFields(fields, next, undefined, validationContext),
    );
  }

  /**
   * Returns a submit handler, mirroring the React and Vue `useDynamicForm`
   * hooks. Bind it once and use it as the `(ngSubmit)` handler:
   * `onSubmit = this.store.handleSubmit(data => ...)`.
   */
  function handleSubmit(
    onValid: (data: Properties) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void,
  ) {
    return async (e?: Event) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      isSubmitting.set(true);
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
        const snapshot = data();
        isValidating.set(true);
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
        if (data() === snapshot && run === validationRun) {
          errors.set(res.errors);
          validationResult.set(res);
        } else {
          const live = validateFields(
            fields,
            data(),
            undefined,
            validationContext,
          );
          errors.set(live.errors);
          validationResult.set(live);
        }
        isSubmitted.set(true);
        if (res.valid) {
          await onValid(snapshot);
        } else if (onInvalid) {
          onInvalid(res.errors);
        }
      } finally {
        if (thisSubmit === submitRun) {
          isValidating.set(false);
        }
        isSubmitting.set(false);
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
    handleSubmit,
  };
}
