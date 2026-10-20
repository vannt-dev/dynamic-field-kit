import { describe, expect, it, vi } from 'vitest';
import {
  evaluateCondition,
  resolveRequired,
  resolveVisible,
  __resetConditionWarnings,
} from '../src/conditions';
import { buildFieldRendererProps } from '../src/rendererProps';
import type { FieldCondition, FieldDescription } from '../src/types';
import {
  collectFieldPaths,
  validateField,
  validateFieldAsync,
  validateFields,
  validateFieldsAsync,
} from '../src/validation';

const field = (extra: Partial<FieldDescription>): FieldDescription => ({
  name: 'state',
  type: 'text',
  ...extra,
});

describe('evaluateCondition', () => {
  const data = {
    country: 'US',
    age: 0,
    tags: [],
    nick: '',
    address: { city: 'Hanoi', zip: null },
  };

  it.each<[FieldCondition, boolean]>([
    [{ field: 'country', equals: 'US' }, true],
    [{ field: 'country', equals: 'VN' }, false],
    [{ field: 'country', notEquals: 'VN' }, true],
    [{ field: 'missing', notEquals: 'VN' }, true],
    [{ field: 'country', in: ['CA', 'US'] }, true],
    [{ field: 'country', in: [] }, false],
    [{ field: 'age', truthy: true }, false],
    [{ field: 'age', truthy: false }, true],
    [{ field: 'tags', truthy: true }, true],
    [{ field: 'tags', empty: true }, true],
    [{ field: 'nick', empty: true }, true],
    [{ field: 'age', empty: false }, true],
    [{ field: 'missing', empty: true }, true],
    [{ field: 'address.city', equals: 'Hanoi' }, true],
    [{ field: 'address.zip', empty: true }, true],
    [{ field: 'address.nope.deeper', empty: true }, true],
    [
      {
        all: [
          { field: 'country', equals: 'US' },
          { field: 'age', truthy: false },
        ],
      },
      true,
    ],
    [
      {
        all: [
          { field: 'country', equals: 'US' },
          { field: 'age', truthy: true },
        ],
      },
      false,
    ],
    [{ all: [] }, true],
    [
      {
        any: [
          { field: 'country', equals: 'VN' },
          { field: 'nick', empty: true },
        ],
      },
      true,
    ],
    [{ any: [] }, false],
    [{ not: { field: 'country', equals: 'US' } }, false],
  ])('%j is %s', (condition, expected) => {
    expect(evaluateCondition(condition, data)).toBe(expected);
  });

  it('compares arrays and objects by value, like JSON Schema const', () => {
    expect(
      evaluateCondition(
        { field: 'picked', equals: ['a', 'b'] },
        { picked: ['a', 'b'] },
      ),
    ).toBe(true);
    expect(
      evaluateCondition({ field: 'picked', in: [['a']] }, { picked: ['a'] }),
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: 'picked', equals: ['b', 'a'] },
        { picked: ['a', 'b'] },
      ),
    ).toBe(false);
  });

  it('reads the top-level form with root: true, and its own level otherwise', () => {
    const item = { kind: 'home' };
    const root = { kind: 'business', contacts: [item] };
    expect(
      evaluateCondition({ field: 'kind', equals: 'home' }, item, root),
    ).toBe(true);
    expect(
      evaluateCondition(
        { field: 'kind', equals: 'business', root: true },
        item,
        root,
      ),
    ).toBe(true);
    // Without a separate root, root is the data itself.
    expect(
      evaluateCondition({ field: 'kind', equals: 'home', root: true }, item),
    ).toBe(true);
  });

  it('is false, with one warning, for a condition it cannot read', () => {
    __resetConditionWarnings();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const broken = {
      field: 'country',
      like: 'U%',
    } as unknown as FieldCondition;
    expect(evaluateCondition(broken, { country: 'US' })).toBe(false);
    expect(evaluateCondition(broken, { country: 'US' })).toBe(false);
    expect(evaluateCondition(null as unknown as FieldCondition, {})).toBe(
      false,
    );
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('resolveVisible / resolveRequired', () => {
  it('is visible without any condition', () => {
    expect(resolveVisible(field({}), {})).toBe(true);
  });

  it('follows appearWhen', () => {
    const f = field({ appearWhen: { field: 'country', equals: 'US' } });
    expect(resolveVisible(f, { country: 'US' })).toBe(true);
    expect(resolveVisible(f, { country: 'VN' })).toBe(false);
  });

  it('lets appearCondition win over appearWhen when both are set', () => {
    const f = field({
      appearWhen: { field: 'country', equals: 'US' },
      appearCondition: () => true,
    });
    expect(resolveVisible(f, { country: 'VN' })).toBe(true);
  });

  it('follows requiredWhen, and required: true wins over it', () => {
    const f = field({ requiredWhen: { field: 'country', equals: 'US' } });
    expect(resolveRequired(f, { country: 'US' })).toBe(true);
    expect(resolveRequired(f, { country: 'VN' })).toBe(false);
    expect(resolveRequired({ ...f, required: true }, { country: 'VN' })).toBe(
      true,
    );
    expect(resolveRequired(field({}), {})).toBe(false);
  });
});

describe('declarative conditions in validation', () => {
  const fields: FieldDescription[] = [
    { name: 'country', type: 'select' },
    {
      name: 'state',
      type: 'text',
      requiredWhen: { field: 'country', equals: 'US' },
    },
    {
      name: 'vat',
      type: 'text',
      appearWhen: { field: 'country', in: ['DE', 'FR'] },
      validate: () => 'always wrong',
    },
  ];

  it('reports a required message when requiredWhen holds and the value is empty', () => {
    expect(validateFields(fields, { country: 'US' }).errors).toEqual({
      state: ['Field is required'],
    });
    expect(validateFields(fields, { country: 'US', state: 'CA' }).valid).toBe(
      true,
    );
    expect(validateFields(fields, { country: 'VN' }).valid).toBe(true);
  });

  it('skips a field hidden by appearWhen, and validates it once shown', () => {
    expect(
      validateFields(fields, { country: 'VN' }).errors.vat,
    ).toBeUndefined();
    expect(validateFields(fields, { country: 'DE' }).errors.vat).toEqual([
      'always wrong',
    ]);
    expect(collectFieldPaths(fields, { country: 'VN' })).toEqual([
      'country',
      'state',
    ]);
    expect(collectFieldPaths(fields, { country: 'FR' })).toEqual([
      'country',
      'state',
      'vat',
    ]);
  });

  it('does the same in the async pass', async () => {
    const res = await validateFieldsAsync(fields, { country: 'US' });
    expect(res.errors).toEqual({ state: ['Field is required'] });
    const shown = await validateFieldsAsync(fields, {
      country: 'FR',
      state: 'x',
    });
    expect(shown.errors).toEqual({ vat: ['always wrong'] });
  });

  it('uses the message catalog for the required message', async () => {
    const t = (key: string) => (key === 'required' ? 'Bắt buộc' : undefined);
    const state = fields[1];
    expect(
      validateField(state, '', { country: 'US' }, undefined, { t }),
    ).toEqual(['Bắt buộc']);
    expect(
      await validateFieldAsync(state, '', { country: 'US' }, undefined, { t }),
    ).toEqual(['Bắt buộc']);
  });

  it('runs the field own validate hook once the required value is there', () => {
    const f = field({
      requiredWhen: { field: 'country', equals: 'US' },
      validate: (value) => (value === 'xx' ? 'bad state' : undefined),
    });
    expect(validateField(f, '', { country: 'US' })).toEqual([
      'Field is required',
    ]);
    expect(validateField(f, 'xx', { country: 'US' })).toEqual(['bad state']);
  });

  it('leaves required: true to its validate hook, as before', () => {
    const f = field({
      required: true,
      requiredWhen: { field: 'country', equals: 'US' },
    });
    expect(validateField(f, '', { country: 'US' })).toEqual([]);
  });

  it('reads a condition inside a group against the item, with root: true for the form', () => {
    const group: FieldDescription[] = [
      { name: 'mode', type: 'select' },
      {
        name: 'contacts',
        type: 'text',
        fields: [
          { name: 'kind', type: 'select' },
          {
            name: 'company',
            type: 'text',
            requiredWhen: { field: 'kind', equals: 'work' },
          },
          {
            name: 'taxId',
            type: 'text',
            requiredWhen: { field: 'mode', equals: 'business', root: true },
          },
        ],
      },
    ];
    const res = validateFields(group, {
      mode: 'business',
      contacts: [{ kind: 'work' }, { kind: 'home', taxId: '1' }],
    });
    expect(res.errors).toEqual({
      'contacts[0].company': ['Field is required'],
      'contacts[0].taxId': ['Field is required'],
    });
  });

  it('reads a condition inside a section against the section object', () => {
    const section: FieldDescription[] = [
      {
        name: 'address',
        type: 'text',
        section: [
          { name: 'country', type: 'select' },
          {
            name: 'state',
            type: 'text',
            requiredWhen: { field: 'country', equals: 'US' },
          },
        ],
      },
    ];
    expect(
      validateFields(section, { address: { country: 'US' } }).errors,
    ).toEqual({
      'address.state': ['Field is required'],
    });
  });
});

describe('declarative conditions in renderer props', () => {
  it('passes the resolved required flag to the renderer', () => {
    const f = field({ requiredWhen: { field: 'country', equals: 'US' } });
    const on = buildFieldRendererProps({
      fieldDescription: f,
      data: { country: 'US' },
      id: 'x',
    });
    expect(on.required).toBe(true);
    expect(on.ariaRequired).toBe(true);
    const off = buildFieldRendererProps({
      fieldDescription: f,
      data: { country: 'VN' },
      id: 'x',
    });
    expect(off.required).toBe(false);
    expect(off.ariaRequired).toBe(false);
  });

  it('keeps required as given for a field without requiredWhen', () => {
    const props = buildFieldRendererProps({
      fieldDescription: field({}),
      data: {},
      id: 'x',
    });
    expect(props.required).toBeUndefined();
  });
});
