import { computed, signal } from '@angular/core';
import {
  applyComputedValues,
  FieldDescription,
  Properties,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';

export interface DynamicFormOptions {
  fields: FieldDescription[];
  initialValues?: Properties;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function createDynamicFormStore(options: DynamicFormOptions) {
  const fields = options.fields;
  const initialValues = options.initialValues || {};
  const validateOnBlur = options.validateOnBlur ?? true;
  const validateOnChange = options.validateOnChange ?? false;

  const data = signal<Properties>(applyComputedValues(fields, initialValues));
  const errors = signal<Record<string, string[]>>({});
  const isDirty = signal<boolean>(false);
  const touched = signal<Record<string, boolean>>({});
  const isSubmitting = signal<boolean>(false);
  const isSubmitted = signal<boolean>(false);

  // Errors remain lazy for display, while validity always reflects current
  // data. Promise-based rules are provisional until validateAsync/submit.
  const isValid = computed(() => validateFields(fields, data()).valid);

  function validate(): boolean {
    const res = validateFields(fields, data());
    errors.set(res.errors);
    return res.valid;
  }

  async function validateAsync(): Promise<boolean> {
    const res = await validateFieldsAsync(fields, data());
    errors.set(res.errors);
    return res.valid;
  }

  function handleChange(newData: Properties) {
    const next = applyComputedValues(fields, newData);
    data.set(next);
    isDirty.set(true);

    if (validateOnChange) {
      const res = validateFields(fields, next);
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
    touched.set(Object.fromEntries(fields.map((f) => [f.name, true] as const)));
  }

  /** Clears the touched map without touching data, errors or dirty state. */
  function resetTouched() {
    touched.set({});
  }

  function handleBlur(fieldName: string) {
    setFieldTouched(fieldName, true);
    if (validateOnBlur) {
      const res = validateFields(fields, data());
      errors.set(res.errors);
    }
  }

  function reset(newValues?: Properties) {
    const seed = newValues ?? initialValues;
    const next = applyComputedValues(fields, seed);
    data.set(next);
    errors.set({});
    isDirty.set(false);
    touched.set({});
    isSubmitting.set(false);
    isSubmitted.set(false);
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
      try {
        // Touch everything before validating: a submit is the user asserting
        // the form is finished, so a field they never focused should still
        // show its error. Without this, submitting an untouched form appears
        // to do nothing at all.
        touchAll();
        const res = await validateFieldsAsync(fields, data());
        errors.set(res.errors);
        isSubmitted.set(true);
        if (res.valid) {
          await onValid(data());
        } else if (onInvalid) {
          onInvalid(res.errors);
        }
      } finally {
        isSubmitting.set(false);
      }
    };
  }

  return {
    data,
    errors,
    isValid,
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
