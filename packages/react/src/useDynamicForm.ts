import {
  applyComputedValues,
  FieldDescription,
  Properties,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import React, { useCallback, useMemo, useState } from 'react';

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
  /** Replaces the whole touched map. */
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /**
   * Marks every field touched at once. `handleSubmit` calls this for you, so
   * an invalid submit surfaces errors on fields the user never focused - pass
   * `touched` into `MultiFieldInput` for it to take effect.
   */
  touchAll: () => void;
  /** Clears the touched map without touching data, errors or dirty state. */
  resetTouched: () => void;
  handleChange: (newData: Properties) => void;
  handleBlur: (fieldName: string) => void;
  reset: (newValues?: Properties) => void;
  validate: () => boolean;
  /** Validate all fields and await Promise-based rules. */
  validateAsync: () => Promise<boolean>;
  handleSubmit: (
    onValid: (data: Properties) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void,
  ) => (e?: React.FormEvent) => Promise<void>;
}

export function useDynamicForm({
  fields,
  initialValues = {},
  validateOnBlur = true,
  validateOnChange = false,
}: UseDynamicFormOptions): UseDynamicFormResult {
  const [data, setData] = useState<Properties>(() =>
    applyComputedValues(fields, initialValues),
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

  const validateAsync = useCallback(async () => {
    const res = await validateFieldsAsync(fields, data);
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
    [fields, validateOnChange],
  );

  const setFieldValue = useCallback(
    (name: string, value: unknown) => {
      handleChange({ ...data, [name]: value });
    },
    [data, handleChange],
  );

  const setFieldTouched = useCallback((name: string, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [name]: isTouched }));
  }, []);

  const touchAll = useCallback(() => {
    setTouched(Object.fromEntries(fields.map((f) => [f.name, true] as const)));
  }, [fields]);

  const resetTouched = useCallback(() => setTouched({}), []);

  const handleBlur = useCallback(
    (fieldName: string) => {
      setFieldTouched(fieldName, true);
      if (validateOnBlur) {
        const res = validateFields(fields, data);
        setErrors(res.errors);
      }
    },
    [fields, data, validateOnBlur, setFieldTouched],
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
    [fields, initialValues],
  );

  const handleSubmit = useCallback(
    (
      onValid: (data: Properties) => void | Promise<void>,
      onInvalid?: (errors: Record<string, string[]>) => void,
    ) =>
      async (e?: React.FormEvent) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        setIsSubmitting(true);
        try {
          // Touch everything before validating: a submit is the user asserting
          // the form is finished, so a field they never focused should still
          // show its error. Without this, submitting an untouched form appears
          // to do nothing at all.
          touchAll();
          // A submit handler is already async, so use one async-capable pass.
          // Sync hooks still run once; Promise-based hooks are awaited instead
          // of being invoked once for detection and a second time for results.
          const res = await validateFieldsAsync(fields, data);
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
    [fields, data, touchAll],
  );

  // Derived from the current data, not from `errors`. `errors` is deliberately
  // lazy - it fills in on validate/blur/submit so a pristine form does not show
  // messages - but deriving `isValid` from it meant an empty required field
  // reported `isValid: true` until one of those happened, which is precisely
  // when a submit button wants to be disabled. Async validators still read as
  // valid here; only submitting (or `validateAsync`) can await them.
  const isValid = useMemo(
    () => validateFields(fields, data).valid,
    [fields, data],
  );

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
    setTouched,
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
