import { describe, expect, test } from 'vitest';
import {
  resolveDisabled,
  resolveReadOnly,
  validateField,
} from '../src/validation';
import type { FieldDescription } from '../src';

declare module '../src' {
  interface FieldTypeMap {
    text: string;
  }
}

describe('validateField', () => {
  const base: FieldDescription = { name: 'email', type: 'text' };

  test('returns [] when there is no validate hook', () => {
    expect(validateField(base, 'x', {})).toEqual([]);
  });

  test('wraps a single string into a one-element array', () => {
    const field: FieldDescription = {
      ...base,
      validate: () => 'Required',
    };
    expect(validateField(field, '', {})).toEqual(['Required']);
  });

  test('passes arrays through and returns [] for falsy results', () => {
    const many: FieldDescription = { ...base, validate: () => ['a', 'b'] };
    const ok: FieldDescription = { ...base, validate: () => undefined };
    expect(validateField(many, '', {})).toEqual(['a', 'b']);
    expect(validateField(ok, '', {})).toEqual([]);
  });

  test('receives value, data and rootData', () => {
    const field: FieldDescription = {
      name: 'city',
      type: 'text',
      validate: (value, data, rootData) =>
        `${value}:${data.country}:${rootData?.locale}`,
    };
    expect(
      validateField(field, 'x', { country: 'vn' }, { locale: 'en' })
    ).toEqual(['x:vn:en']);
  });
});

describe('resolveDisabled / resolveReadOnly', () => {
  test('resolveDisabled OR-s the static flag and the condition', () => {
    expect(resolveDisabled({ name: 'a', type: 'text' }, {})).toBe(false);
    expect(
      resolveDisabled({ name: 'a', type: 'text', disabled: true }, {})
    ).toBe(true);
    expect(
      resolveDisabled(
        { name: 'a', type: 'text', disabledCondition: (d) => d.lock === true },
        { lock: true }
      )
    ).toBe(true);
  });

  test('resolveReadOnly reflects the condition', () => {
    expect(resolveReadOnly({ name: 'a', type: 'text' }, {})).toBe(false);
    expect(
      resolveReadOnly(
        {
          name: 'a',
          type: 'text',
          readOnlyCondition: (d) => d.frozen === true,
        },
        { frozen: true }
      )
    ).toBe(true);
  });
});
