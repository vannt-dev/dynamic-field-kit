import {
  applyComputedValues,
  FieldDescription,
  Properties,
  validateFields,
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

  const isValid = computed(() => Object.keys(errors.value).length === 0);

  function validate() {
    const res = validateFields(fields, data.value);
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
    onInvalid?: (errors: Record<string, string[]>) => void
  ) {
    return async (e?: Event) => {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      isSubmitting.value = true;
      try {
        const res = validateFields(fields, data.value);
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
    handleChange,
    handleBlur,
    reset,
    validate,
    handleSubmit,
  };
}
