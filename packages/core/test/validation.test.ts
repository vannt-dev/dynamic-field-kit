import { describe, expect, test } from 'vitest';
import {
  resolveDisabled,
  resolveReadOnly,
  validateField,
  validateFields,
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

describe('validateFields', () => {
  const required = (msg: string) => (v: unknown) => (v ? undefined : msg);

  test('collects leaf errors and reports overall validity', () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', validate: required('Name required') },
      { name: 'email', type: 'text' },
    ];
    const result = validateFields(fields, { name: '', email: 'x' });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ name: ['Name required'] });
  });

  test('is valid when everything passes', () => {
    const fields: FieldDescription[] = [
      { name: 'name', type: 'text', validate: required('r') },
    ];
    expect(validateFields(fields, { name: 'Ada' })).toEqual({
      valid: true,
      errors: {},
    });
  });

  test('skips fields hidden by appearCondition', () => {
    const fields: FieldDescription[] = [
      {
        name: 'company',
        type: 'text',
        appearCondition: (d) => d.type === 'business',
        validate: required('Company required'),
      },
    ];
    expect(validateFields(fields, { type: 'personal' }).valid).toBe(true);
  });

  test('skips disabled fields but still validates readOnly ones', () => {
    const fields: FieldDescription[] = [
      { name: 'a', type: 'text', disabled: true, validate: required('A') },
      {
        name: 'b',
        type: 'text',
        disabledCondition: () => true,
        validate: required('B'),
      },
      {
        name: 'c',
        type: 'text',
        readOnlyCondition: () => true,
        validate: required('C'),
      },
    ];
    const result = validateFields(fields, { a: '', b: '', c: '' });
    expect(result.errors).toEqual({ c: ['C'] });
  });

  test('descends into groups with indexed path keys and threads rootData', () => {
    const fields: FieldDescription[] = [
      {
        name: 'contacts',
        type: 'text',
        fields: [
          {
            name: 'email',
            type: 'text',
            validate: (v, _d, rootData) =>
              rootData?.strict && !v ? 'Email required' : undefined,
          },
        ],
      },
    ];
    const data = { strict: true, contacts: [{ email: 'a@b' }, { email: '' }] };
    const result = validateFields(fields, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({ 'contacts[1].email': ['Email required'] });
  });
});
