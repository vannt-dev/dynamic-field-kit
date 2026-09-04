import { describe, expect, it, test } from 'vitest';
import type { FieldDescription } from '../src';
import { zodValidator, yupValidator } from '../src/adapters';
import { createMessageResolver } from '../src/messages';
import {
  resolveDisabled,
  resolveOptions,
  resolveReadOnly,
  validateField,
  validateFields,
  validateFieldsAsync,
} from '../src/validation';
import { validators } from '../src/validators';

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
      validateField(field, 'x', { country: 'vn' }, { locale: 'en' }),
    ).toEqual(['x:vn:en']);
  });
});

describe('resolveDisabled / resolveReadOnly', () => {
  test('resolveDisabled OR-s the static flag and the condition', () => {
    expect(resolveDisabled({ name: 'a', type: 'text' }, {})).toBe(false);
    expect(
      resolveDisabled({ name: 'a', type: 'text', disabled: true }, {}),
    ).toBe(true);
    expect(
      resolveDisabled(
        { name: 'a', type: 'text', disabledCondition: (d) => d.lock === true },
        { lock: true },
      ),
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
        { frozen: true },
      ),
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
      complete: true,
      status: 'valid',
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

describe('resolveOptions', () => {
  test('resolves static options array and dynamic options callback', () => {
    const staticField: FieldDescription = {
      name: 'role',
      type: 'text',
      options: [{ label: 'Admin', value: 'admin' }],
    };
    const dynamicField: FieldDescription = {
      name: 'city',
      type: 'text',
      options: (data) =>
        data.country === 'vn'
          ? [{ label: 'Hanoi', value: 'hn' }]
          : [{ label: 'Other', value: 'other' }],
    };

    expect(resolveOptions(staticField, {})).toEqual([
      { label: 'Admin', value: 'admin' },
    ]);
    expect(resolveOptions(dynamicField, { country: 'vn' })).toEqual([
      { label: 'Hanoi', value: 'hn' },
    ]);
  });
});

describe('validateFieldsAsync', () => {
  test('handles async promises in validation hooks', async () => {
    const fields: FieldDescription[] = [
      {
        name: 'username',
        type: 'text',
        validate: async (val) => {
          if (val === 'admin') {
            return 'Username taken';
          }
          return undefined;
        },
      },
    ];
    const resTaken = await validateFieldsAsync(fields, { username: 'admin' });
    expect(resTaken.valid).toBe(false);
    expect(resTaken.errors).toEqual({ username: ['Username taken'] });

    const resOk = await validateFieldsAsync(fields, { username: 'john' });
    expect(resOk.valid).toBe(true);
  });
});

describe('zodValidator and yupValidator', () => {
  test('zodValidator parses the value alone for a scalar schema', () => {
    const mockZod = {
      safeParse: (val: unknown) => {
        if (typeof val === 'string' && val.includes('@')) {
          return { success: true };
        }
        return {
          success: false,
          error: {
            errors: [{ message: 'Invalid email address', path: [] }],
          },
        };
      },
    };
    const validator = zodValidator(mockZod, { target: 'field' });
    expect(validator('invalid', {})).toEqual(['Invalid email address']);
    expect(validator('user@test.com', {})).toBeUndefined();
  });

  test('yupValidator parses the value alone for a scalar schema', () => {
    const mockYup = {
      validateSync: (val: unknown) => {
        if (typeof val === 'string' && val.length >= 3) {
          return val;
        }
        throw { message: 'Must be at least 3 chars' };
      },
    };
    const validator = yupValidator(mockYup, { target: 'field' });
    expect(validator('hi', {})).toEqual(['Must be at least 3 chars']);
    expect(validator('hello', {})).toBeUndefined();
  });
});

describe('validateFields threads the message context', () => {
  const ctxFields: FieldDescription[] = [
    { name: 'title', type: 'text', validate: validators.required() },
  ];

  it('reaches a built-in validator through validateFields', () => {
    const result = validateFields(ctxFields, { title: '' }, undefined, {
      t: createMessageResolver({ required: 'Bắt buộc' }),
    });
    expect(result.errors.title).toEqual(['Bắt buộc']);
  });

  it('reaches it through validateField too', () => {
    expect(
      validateField(ctxFields[0], '', { title: '' }, undefined, {
        t: createMessageResolver({ required: 'Bắt buộc' }),
      }),
    ).toEqual(['Bắt buộc']);
  });

  it('keeps the English default with no context', () => {
    expect(validateFields(ctxFields, { title: '' }).errors.title).toEqual([
      'Field is required',
    ]);
  });

  it('descends into repeatable groups with the context intact', () => {
    const grouped: FieldDescription[] = [
      {
        name: 'items',
        type: 'text',
        fields: [
          { name: 'label', type: 'text', validate: validators.required() },
        ],
      },
    ];
    const result = validateFields(
      grouped,
      { items: [{ label: '' }] },
      undefined,
      { t: createMessageResolver({ required: 'Bắt buộc' }) },
    );
    expect(result.errors['items[0].label']).toEqual(['Bắt buộc']);
  });
});
