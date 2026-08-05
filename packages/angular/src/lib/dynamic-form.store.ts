import { computed, signal } from '@angular/core';
import {
  applyComputedValues,
  FieldDescription,
  Properties,
  validateFields,
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

  const isValid = computed(() => Object.keys(errors()).length === 0);

  function validate(): boolean {
    const res = validateFields(fields, data());
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

  async function handleSubmit(
    onValid: (data: Properties) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void
  ) {
    isSubmitting.set(true);
    try {
      const res = validateFields(fields, data());
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
