import {
  applyComputedValues,
  FieldDescription,
  Properties,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { computed, ref } from 'vue';

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

  // Errors remain lazy for display, while validity always reflects current
  // data. Promise-based rules are provisional until validateAsync/submit.
  const isValid = computed(() => validateFields(fields, data.value).valid);

  function validate() {
    const res = validateFields(fields, data.value);
    errors.value = res.errors;
    return res.valid;
  }

  async function validateAsync() {
    const res = await validateFieldsAsync(fields, data.value);
    errors.value = res.errors;
    return res.valid;
  }

  function handleChange(newData: Properties) {
    const next = applyComputedValues(fields, newData);
    data.value = next;
    isDirty.value = true;

    if (validateOnChange) {
      const res = validateFields(fields, next);
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
      fields.map((f) => [f.name, true] as const),
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
      try {
        // Touch everything before validating: a submit is the user asserting
        // the form is finished, so a field they never focused should still
        // show its error. Without this, submitting an untouched form appears
        // to do nothing at all.
        touchAll();
        const res = await validateFieldsAsync(fields, data.value);
        errors.value = res.errors;
        isSubmitted.value = true;
        if (res.valid) {
          await onValid(data.value);
        } else if (onInvalid) {
          onInvalid(res.errors);
        }
      } finally {
        isSubmitting.value = false;
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
