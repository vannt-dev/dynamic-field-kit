import {
  applyComputedValues,
  collectFieldPaths,
  FieldDescription,
  Properties,
  type ValidationResult,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';

export interface UseDynamicFormOptions {
  fields: FieldDescription[];
  initialValues?: Properties;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function useDynamicForm({
  fields,
  initialValues = {},
  validateOnBlur = true,
  validateOnChange = false,
}: UseDynamicFormOptions) {
  const data = ref<Properties>(applyComputedValues(fields, initialValues));
  const errors = ref<Record<string, string[]>>({});
  const isDirty = ref<boolean>(false);
  const touched = ref<Record<string, boolean>>({});
  const isSubmitting = ref<boolean>(false);
  const isSubmitted = ref<boolean>(false);
  const initialValidation = validateFields(fields, data.value);
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
    const res = validateFields(fields, data.value);
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
    data.value = next;
    isDirty.value = true;
    validationController?.abort();
    validationRun += 1;
    isValidating.value = false;

    const res = validateFields(fields, next);
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
  function resetTouched() {
    touched.value = {};
  }

  function handleBlur(fieldName: string) {
    setFieldTouched(fieldName, true);
    if (validateOnBlur) {
      const res = validateFields(fields, data.value);
      errors.value = res.errors;
      commitSyncResult(res);
    }
  }

  function reset(newValues?: Properties) {
    const seed = newValues ?? initialValues;
    const next = applyComputedValues(fields, seed);
    data.value = next;
    errors.value = {};
    isDirty.value = false;
    touched.value = {};
    isSubmitting.value = false;
    isSubmitted.value = false;
    validationController?.abort();
    validationRun += 1;
    isValidating.value = false;
    commitSyncResult(validateFields(fields, next));
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
          const live = validateFields(fields, data.value);
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
