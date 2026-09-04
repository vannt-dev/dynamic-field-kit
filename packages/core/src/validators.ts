import { resolveMessage } from './messages';
import type { Properties, ValidationContext } from './types';

export type ValidatorFn = (
  value: unknown,
  data?: Properties,
  rootData?: Properties,
  ctx?: ValidationContext,
) => string | undefined;

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export const validators = {
  /** Enforces that a value is non-empty (not undefined, null, empty string, or empty array). */
  required(message?: string): ValidatorFn {
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value) || (Array.isArray(value) && value.length === 0)) {
        // Resolved here, inside the closure, rather than when the field
        // description is built: a catalog supplied to the form could never
        // reach a message baked in at definition time.
        return resolveMessage(
          ctx,
          'required',
          undefined,
          'Field is required',
          message,
        );
      }
      return undefined;
    };
  },

  /** Enforces a valid email format. */
  email(message?: string): ValidatorFn {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      if (typeof value !== 'string' || !emailRegex.test(value)) {
        return resolveMessage(
          ctx,
          'email',
          undefined,
          'Invalid email address',
          message,
        );
      }
      return undefined;
    };
  },

  /** Enforces minimum string length or array length. */
  minLength(min: number, message?: string): ValidatorFn {
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        if (value.length < min) {
          return resolveMessage(
            ctx,
            'minLength',
            { min },
            `Minimum length is ${min}`,
            message,
          );
        }
      }
      return undefined;
    };
  },

  /** Enforces maximum string length or array length. */
  maxLength(max: number, message?: string): ValidatorFn {
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        if (value.length > max) {
          return resolveMessage(
            ctx,
            'maxLength',
            { max },
            `Maximum length is ${max}`,
            message,
          );
        }
      }
      return undefined;
    };
  },

  /** Enforces minimum numerical value. */
  min(minVal: number, message?: string): ValidatorFn {
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      const num = Number(value);
      if (Number.isNaN(num) || num < minVal) {
        return resolveMessage(
          ctx,
          'min',
          { min: minVal },
          `Minimum value is ${minVal}`,
          message,
        );
      }
      return undefined;
    };
  },

  /** Enforces maximum numerical value. */
  max(maxVal: number, message?: string): ValidatorFn {
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      const num = Number(value);
      if (Number.isNaN(num) || num > maxVal) {
        return resolveMessage(
          ctx,
          'max',
          { max: maxVal },
          `Maximum value is ${maxVal}`,
          message,
        );
      }
      return undefined;
    };
  },

  /** Enforces a regex pattern. */
  pattern(regex: RegExp, message?: string): ValidatorFn {
    return (value, _data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      if (typeof value !== 'string' || !regex.test(value)) {
        return resolveMessage(
          ctx,
          'pattern',
          undefined,
          'Invalid format',
          message,
        );
      }
      return undefined;
    };
  },

  /**
   * Enforces that this field equals another field's value - confirm-password,
   * confirm-email. Skips empty values so `required` owns that message rather
   * than both firing at once.
   */
  matches(otherFieldName: string, message?: string): ValidatorFn {
    return (value, data, _rootData, ctx) => {
      if (isEmpty(value)) {
        return undefined;
      }
      // Object.is, not !==: two NaNs are the same value for this purpose.
      if (Object.is(value, data?.[otherFieldName])) {
        return undefined;
      }
      return resolveMessage(
        ctx,
        'matches',
        { other: otherFieldName },
        `Must match ${otherFieldName}`,
        message,
      );
    };
  },

  /** Combines multiple validator functions into a single field validator. */
  compose(
    ...fns: ValidatorFn[]
  ): (
    value: unknown,
    data: Properties,
    rootData?: Properties,
    ctx?: ValidationContext,
  ) => string[] | undefined {
    return (
      value: unknown,
      data: Properties,
      rootData?: Properties,
      ctx?: ValidationContext,
    ) => {
      const errors: string[] = [];
      for (const fn of fns) {
        const err = fn(value, data, rootData, ctx);
        if (err) {
          errors.push(err);
        }
      }
      return errors.length > 0 ? errors : undefined;
    };
  },
};
