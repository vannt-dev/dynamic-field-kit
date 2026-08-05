import {
  applyComputedValues,
  FieldDescription,
  Properties,
  validateFields,
} from '@dynamic-field-kit/core';
import React, { useCallback, useState } from 'react';

export interface UseDynamicFormOptions {
  fields: FieldDescription[];
  initialValues?: Properties;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface UseDynamicFormResult {
  data: Properties;
  errors: Record<string, string[]>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  touched: Record<string, boolean>;
  setData: React.Dispatch<React.SetStateAction<Properties>>;
  setFieldValue: (name: string, value: unknown) => void;
  setFieldTouched: (name: string, isTouched?: boolean) => void;
  handleChange: (newData: Properties) => void;
  handleBlur: (fieldName: string) => void;
  reset: (newValues?: Properties) => void;
  validate: () => boolean;
  handleSubmit: (
    onValid: (data: Properties) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void
  ) => (e?: React.FormEvent) => Promise<void>;
}

export function useDynamicForm({
  fields,
  initialValues = {},
  validateOnBlur = true,
  validateOnChange = false,
}: UseDynamicFormOptions): UseDynamicFormResult {
  const [data, setData] = useState<Properties>(() =>
    applyComputedValues(fields, initialValues)
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = useCallback(() => {
    const res = validateFields(fields, data);
    setErrors(res.errors);
    return res.valid;
  }, [fields, data]);

  const handleChange = useCallback(
    (newData: Properties) => {
      const next = applyComputedValues(fields, newData);
      setData(next);
      setIsDirty(true);

      if (validateOnChange) {
        const res = validateFields(fields, next);
        setErrors(res.errors);
      }
    },
    [fields, validateOnChange]
  );

  const setFieldValue = useCallback(
    (name: string, value: unknown) => {
      handleChange({ ...data, [name]: value });
    },
    [data, handleChange]
  );

  const setFieldTouched = useCallback((name: string, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  }, []);

  const handleBlur = useCallback(
    (fieldName: string) => {
      setFieldTouched(fieldName, true);
      if (validateOnBlur) {
        const res = validateFields(fields, data);
        setErrors(res.errors);
      }
    },
    [fields, data, validateOnBlur, setFieldTouched]
  );

  const reset = useCallback(
    (newValues?: Properties) => {
      const seed = newValues ?? initialValues;
      const next = applyComputedValues(fields, seed);
      setData(next);
      setErrors({});
      setIsDirty(false);
      setTouched({});
      setIsSubmitting(false);
      setIsSubmitted(false);
    },
    [fields, initialValues]
  );

  const handleSubmit = useCallback(
    (
        onValid: (data: Properties) => void | Promise<void>,
        onInvalid?: (errors: Record<string, string[]>) => void
      ) =>
      async (e?: React.FormEvent) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        setIsSubmitting(true);
        try {
          const res = validateFields(fields, data);
          setErrors(res.errors);
          setIsSubmitted(true);
          if (res.valid) {
            await onValid(data);
          } else if (onInvalid) {
            onInvalid(res.errors);
          }
        } finally {
          setIsSubmitting(false);
        }
      },
    [fields, data]
  );

  const isValid = Object.keys(errors).length === 0;

  return {
    data,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    isSubmitted,
    touched,
    setData,
    setFieldValue,
    setFieldTouched,
    handleChange,
    handleBlur,
    reset,
    validate,
    handleSubmit,
  };
}
