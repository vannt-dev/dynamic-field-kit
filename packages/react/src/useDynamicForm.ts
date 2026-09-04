import {
  applyComputedValues,
  collectFieldPaths,
  FieldDescription,
  Properties,
  type ValidationResult,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  isValidating: boolean;
  isValidationComplete: boolean;
  validationStatus: ValidationResult['status'];
  isDirty: boolean;
  /**
   * The values `dirty` is measured against: the `initialValues` option until
   * `reset(newValues)` replaces them. Distinct from that option, which never
   * changes - pass this to `MultiFieldInput` (or use the `form` shorthand) so
   * per-field `dirty` survives a reset.
   */
  baselineValues: Properties;
  /**
   * The entries of `data` that differ from `baselineValues`. Intended for
   * PATCH-style submits that should carry only what the user actually edited.
   */
  getDirtyValues: () => Properties;
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

function sameStringMap(
  left: Record<string, string[]>,
  right: Record<string, string[]>,
): boolean {
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        left[key]?.length === right[key]?.length &&
        left[key]?.every((value, index) => value === right[key]?.[index]),
    )
  );
}

function sameValidationResult(
  left: ValidationResult,
  right: ValidationResult,
): boolean {
  return (
    left.valid === right.valid &&
    left.complete === right.complete &&
    left.status === right.status &&
    (left.pending ?? []).join('\0') === (right.pending ?? []).join('\0') &&
    sameStringMap(left.errors, right.errors)
  );
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
  // Seeded from the initial data rather than from an effect: an effect never
  // runs on the server, so a server-rendered form would ship `isValid: true`
  // for an empty required field and never correct it. The initialiser runs
  // once, unlike the useMemo this replaced, which ran on every render.
  const [validationResult, setValidationResult] = useState<ValidationResult>(
    () => validateFields(fields, data),
  );
  const [isValidating, setIsValidating] = useState(false);
  const validationRunRef = useRef(0);
  const validationAbortRef = useRef<AbortController | undefined>(undefined);
  // A submit gets its own run counter and controller. Typing aborts the live
  // validation run, and a submit must not be collateral damage of that.
  const submitRunRef = useRef(0);
  const submitAbortRef = useRef<AbortController | undefined>(undefined);
  const dataRef = useRef(data);
  dataRef.current = data;

  // The baseline `dirty` is measured against. Kept in both a ref and state:
  // `getDirtyValues` needs it synchronously at call time, while
  // `MultiFieldInput` needs a render-visible value. Both are written together
  // in `reset`, the only place it changes.
  const baselineRef = useRef<Properties>(dataRef.current);
  const [baselineValues, setBaselineValues] = useState<Properties>(
    () => baselineRef.current,
  );

  const commitSyncResult = useCallback((res: ValidationResult) => {
    setValidationResult((previous) =>
      sameValidationResult(previous, res) ? previous : res,
    );
    return res.valid;
  }, []);

  // Keeps the result in step with later data changes. The seed above covers
  // the first render (including the server's); from here on validators run
  // after commit, never from a useMemo that re-runs on every render.
  // Identity of the data the synchronous pass last ran against. `handleChange`
  // validates eagerly so `errors` is correct in the same tick; without this
  // the effect below would then validate the identical object a second time.
  const lastValidatedRef = useRef<Properties | undefined>(undefined);
  // A `fields` change must re-validate even when `data` is untouched, so
  // re-arm the guard rather than letting the identity match short-circuit it.
  const fieldsRef = useRef(fields);
  if (fieldsRef.current !== fields) {
    fieldsRef.current = fields;
    lastValidatedRef.current = undefined;
  }

  useEffect(() => {
    if (lastValidatedRef.current === data) {
      return;
    }
    lastValidatedRef.current = data;
    commitSyncResult(validateFields(fields, data));
  }, [fields, data, commitSyncResult]);

  useEffect(
    () => () => {
      validationAbortRef.current?.abort();
      submitAbortRef.current?.abort();
    },
    [],
  );

  const validate = useCallback(() => {
    const res = validateFields(fields, data);
    setErrors(res.errors);
    return commitSyncResult(res);
  }, [fields, data, commitSyncResult]);

  const validateAsync = useCallback(async () => {
    const run = ++validationRunRef.current;
    validationAbortRef.current?.abort();
    const controller = new AbortController();
    validationAbortRef.current = controller;
    const snapshot = data;
    setIsValidating(true);
    try {
      const res = await validateFieldsAsync(fields, snapshot, snapshot, {
        signal: controller.signal,
      });
      if (run !== validationRunRef.current || dataRef.current !== snapshot) {
        return res.valid;
      }
      setErrors(res.errors);
      setValidationResult(res);
      return res.valid;
    } finally {
      if (run === validationRunRef.current) {
        setIsValidating(false);
      }
    }
  }, [fields, data]);

  const handleChange = useCallback(
    (newData: Properties) => {
      const next = applyComputedValues(fields, newData);
      setData(next);
      dataRef.current = next;
      setIsDirty(true);
      validationAbortRef.current?.abort();
      validationRunRef.current += 1;
      setIsValidating(false);

      lastValidatedRef.current = next;
      const res = validateFields(fields, next);
      commitSyncResult(res);

      if (validateOnChange) {
        setErrors(res.errors);
      }
    },
    [fields, validateOnChange, commitSyncResult],
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
    setTouched(
      Object.fromEntries(
        collectFieldPaths(fields, data).map((path) => [path, true] as const),
      ),
    );
  }, [fields, data]);

  const resetTouched = useCallback(() => setTouched({}), []);

  const getDirtyValues = useCallback((): Properties => {
    const baseline = baselineRef.current;
    const current = dataRef.current;
    const dirty: Properties = {};
    for (const key of Object.keys(current)) {
      if (!Object.is(current[key], baseline[key])) {
        dirty[key] = current[key];
      }
    }
    return dirty;
  }, []);

  const handleBlur = useCallback(
    (fieldName: string) => {
      setFieldTouched(fieldName, true);
      if (validateOnBlur) {
        const res = validateFields(fields, data);
        setErrors(res.errors);
        commitSyncResult(res);
      }
    },
    [fields, data, validateOnBlur, setFieldTouched, commitSyncResult],
  );

  const reset = useCallback(
    (newValues?: Properties) => {
      const seed = newValues ?? initialValues;
      const next = applyComputedValues(fields, seed);
      setData(next);
      dataRef.current = next;
      baselineRef.current = next;
      setBaselineValues(next);
      setErrors({});
      setIsDirty(false);
      setTouched({});
      setIsSubmitting(false);
      setIsSubmitted(false);
      validationAbortRef.current?.abort();
      validationRunRef.current += 1;
      setIsValidating(false);
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
        const submitRun = ++submitRunRef.current;
        try {
          // Touch everything before validating: a submit is the user asserting
          // the form is finished, so a field they never focused should still
          // show its error. Without this, submitting an untouched form appears
          // to do nothing at all.
          touchAll();
          // A submit handler is already async, so use one async-capable pass.
          // Sync hooks still run once; Promise-based hooks are awaited instead
          // of being invoked once for detection and a second time for results.
          const run = ++validationRunRef.current;
          // Cancel any live run so its (older) result cannot land on top of
          // this one, but validate under a controller of the submit's own.
          validationAbortRef.current?.abort();
          submitAbortRef.current?.abort();
          const controller = new AbortController();
          submitAbortRef.current = controller;
          const snapshot = data;
          setIsValidating(true);
          const res = await validateFieldsAsync(fields, snapshot, snapshot, {
            signal: controller.signal,
          });
          if (submitRun !== submitRunRef.current) {
            return;
          }
          // Editing during the submit does not cancel it - the user submitted
          // this snapshot and is owed an answer for it. What the form *shows*
          // still has to describe the data on screen, so when it moved on, the
          // displayed state is re-derived instead of showing the old pass.
          if (
            dataRef.current === snapshot &&
            run === validationRunRef.current
          ) {
            setErrors(res.errors);
            setValidationResult(res);
          } else {
            const live = validateFields(fields, dataRef.current);
            setErrors(live.errors);
            commitSyncResult(live);
          }
          setIsSubmitted(true);
          if (res.valid) {
            await onValid(snapshot);
          } else if (onInvalid) {
            onInvalid(res.errors);
          }
        } finally {
          if (submitRun === submitRunRef.current) {
            setIsValidating(false);
          }
          setIsSubmitting(false);
        }
      },
    [fields, data, touchAll, commitSyncResult],
  );

  return {
    data,
    errors,
    isValid: validationResult.valid,
    isValidating,
    // Matches Vue and Angular: a run still in flight is not complete, whatever
    // the last finished pass concluded.
    isValidationComplete: validationResult.complete && !isValidating,
    validationStatus: isValidating ? 'pending' : validationResult.status,
    isDirty,
    baselineValues,
    getDirtyValues,
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
