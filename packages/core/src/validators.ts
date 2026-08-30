import type { Properties } from './types';

export type ValidatorFn = (
  value: unknown,
  data?: Properties,
  rootData?: Properties,
) => string | undefined;

export const validators = {
  /** Enforces that a value is non-empty (not undefined, null, empty string, or empty array). */
  required(message = 'Field is required'): ValidatorFn {
    return (value: unknown) => {
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return message;
      }
      return undefined;
    };
  },

  /** Enforces a valid email format. */
  email(message = 'Invalid email address'): ValidatorFn {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value !== 'string' || !emailRegex.test(value)) {
        return message;
      }
      return undefined;
    };
  },

  /** Enforces minimum string length or array length. */
  minLength(min: number, message?: string): ValidatorFn {
    const msg = message ?? `Minimum length is ${min}`;
    return (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        if (value.length < min) {
          return msg;
        }
      }
      return undefined;
    };
  },

  /** Enforces maximum string length or array length. */
  maxLength(max: number, message?: string): ValidatorFn {
    const msg = message ?? `Maximum length is ${max}`;
    return (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        if (value.length > max) {
          return msg;
        }
      }
      return undefined;
    };
  },

  /** Enforces minimum numerical value. */
  min(minVal: number, message?: string): ValidatorFn {
    const msg = message ?? `Minimum value is ${minVal}`;
    return (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const num = Number(value);
      if (Number.isNaN(num) || num < minVal) {
        return msg;
      }
      return undefined;
    };
  },

  /** Enforces maximum numerical value. */
  max(maxVal: number, message?: string): ValidatorFn {
    const msg = message ?? `Maximum value is ${maxVal}`;
    return (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const num = Number(value);
      if (Number.isNaN(num) || num > maxVal) {
        return msg;
      }
      return undefined;
    };
  },

  /** Enforces a regex pattern. */
  pattern(regex: RegExp, message = 'Invalid format'): ValidatorFn {
    return (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value !== 'string' || !regex.test(value)) {
        return message;
      }
      return undefined;
    };
  },

  /** Combines multiple validator functions into a single field validator. */
  compose(
    ...fns: ValidatorFn[]
  ): (
    value: unknown,
    data: Properties,
    rootData?: Properties,
  ) => string[] | undefined {
    return (value: unknown, data: Properties, rootData?: Properties) => {
      const errors: string[] = [];
      for (const fn of fns) {
        const err = fn(value, data, rootData);
        if (err) {
          errors.push(err);
        }
      }
      return errors.length > 0 ? errors : undefined;
    };
  },
};
