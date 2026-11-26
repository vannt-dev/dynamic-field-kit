import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/validateConfig';

const errorsOf = (config: unknown) =>
  validateConfig(config)
    .problems.filter((problem) => problem.severity === 'error')
    .map((problem) => problem.path);

const warningsOf = (config: unknown, knownTypes?: string[]) =>
  validateConfig(config, { knownTypes })
    .problems.filter((problem) => problem.severity === 'warning')
    .map((problem) => [problem.path, problem.message]);

describe('validateConfig', () => {
  it('accepts a valid config', () => {
    const result = validateConfig([
      {
        name: 'country',
        type: 'select',
        options: [{ label: 'US', value: 'US' }],
      },
      {
        name: 'state',
        type: 'text',
        appearWhen: { field: 'country', equals: 'US' },
        requiredWhen: {
          all: [
            { field: 'country', in: ['US'] },
            { not: { field: 'country', empty: true } },
          ],
        },
      },
      {
        name: 'contacts',
        type: 'group',
        minItems: 1,
        maxItems: 3,
        fields: [
          { name: 'email', type: 'email' },
          {
            name: 'phone',
            type: 'tel',
            appearWhen: { field: 'email', empty: true },
          },
          {
            name: 'vat',
            type: 'text',
            appearWhen: { field: 'country', root: true, equals: 'DE' },
          },
        ],
      },
      {
        name: 'address',
        type: 'section',
        section: [{ name: 'city', type: 'text' }],
      },
    ]);

    expect(result).toEqual({ valid: true, problems: [] });
  });

  it('rejects what is not a field list', () => {
    expect(errorsOf({ fields: [] })).toEqual(['(root)']);
    expect(errorsOf([1, null])).toEqual(['[0]', '[1]']);
  });

  it('needs a name and a type, and unique names per level', () => {
    expect(
      errorsOf([{ type: 'text' }, { name: 'a' }, { name: 'a', type: 'text' }]),
    ).toEqual(['[0].name', '[1].type', '[2].name']);
    // The same name at different levels is fine.
    expect(
      errorsOf([
        { name: 'a', type: 'text' },
        { name: 'g', type: 'group', fields: [{ name: 'a', type: 'text' }] },
      ]),
    ).toEqual([]);
  });

  it('flags malformed conditions, which core reads as false', () => {
    const result = validateConfig([
      { name: 'a', type: 'text' },
      { name: 'b', type: 'text', appearWhen: { field: 'a' } },
      {
        name: 'c',
        type: 'text',
        appearWhen: { field: 'a', equals: 1, notEquals: 2 },
      },
      { name: 'd', type: 'text', appearWhen: { equals: 1 } },
      { name: 'e', type: 'text', disabledWhen: { field: 'a', in: 'x' } },
      { name: 'f', type: 'text', readOnlyWhen: { field: 'a', gt: 'many' } },
      {
        name: 'g',
        type: 'text',
        requiredWhen: { all: { field: 'a', truthy: true } },
      },
      {
        name: 'h',
        type: 'text',
        requiredWhen: { any: [{ field: 'a', truthy: 'yes' }] },
      },
      { name: 'i', type: 'text', appearWhen: 'a == 1' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.problems.map((problem) => problem.path)).toEqual([
      '[1].appearWhen',
      '[2].appearWhen',
      '[3].appearWhen',
      '[4].disabledWhen.in',
      '[5].readOnlyWhen.gt',
      '[6].requiredWhen.all',
      '[7].requiredWhen.any[0].truthy',
      '[8].appearWhen',
    ]);
    expect(result.problems[1].message).toContain('more than one comparison');
  });

  it('warns about a condition that reads a field that is not there', () => {
    expect(
      warningsOf([
        {
          name: 'a',
          type: 'text',
          appearWhen: { field: 'missing', equals: 1 },
        },
        {
          name: 'g',
          type: 'group',
          fields: [
            { name: 'x', type: 'text', appearWhen: { field: 'a', equals: 1 } },
            {
              name: 'y',
              type: 'text',
              appearWhen: { field: 'a', root: true, equals: 1 },
            },
            {
              name: 'z',
              type: 'text',
              appearWhen: { field: 'xx', truthy: true },
            },
            {
              name: 'w',
              type: 'text',
              appearWhen: { field: 'b', root: true, truthy: true },
            },
          ],
        },
        { name: 'plan', type: 'text', appearWhen: { field: 'pln', equals: 1 } },
      ]),
    ).toEqual([
      ['[0].appearWhen.field', 'no field named "missing" at this level'],
      [
        '[1].fields[0].appearWhen.field',
        'no field named "a" at this level; it is a top-level field: set "root": true to read it',
      ],
      ['[1].fields[2].appearWhen.field', 'no field named "xx" at this level'],
      [
        '[1].fields[3].appearWhen.field',
        'no field named "b" at the top level of the form',
      ],
      [
        '[2].appearWhen.field',
        'no field named "pln" at this level; did you mean "plan"?',
      ],
    ]);
  });

  it('warns about unknown keys, with a suggestion for a misspelt one', () => {
    expect(
      warningsOf([{ name: 'a', type: 'text', requried: true, colour: 'red' }]),
    ).toEqual([
      ['[0].requried', 'unknown key "requried"; did you mean "required"?'],
      ['[0].colour', 'unknown key "colour"'],
    ]);
  });

  it('rejects data in keys that only take a function', () => {
    const result = validateConfig([
      { name: 'a', type: 'text', validate: 'required', computeValue: 1 },
    ]);
    expect(result.problems.map((problem) => problem.path)).toEqual([
      '[0].validate',
      '[0].computeValue',
    ]);
    expect(result.problems[0].message).toContain('JSON config cannot hold');
  });

  it('accepts functions where a config is built in code', () => {
    expect(
      validateConfig([
        {
          name: 'a',
          type: 'text',
          validate: () => undefined,
          options: () => [],
        },
      ]).valid,
    ).toBe(true);
  });

  it('checks the type of each key', () => {
    expect(
      errorsOf([
        {
          name: 'a',
          type: 'text',
          label: 1,
          required: 'yes',
          validationMode: 'later',
          options: 'a,b',
          min: true,
          mask: 9,
          debounceMs: -1,
          props: [],
        },
        { name: 'b', type: 'select', options: ['x'] },
      ]),
    ).toEqual([
      '[0].label',
      '[0].required',
      '[0].validationMode',
      '[0].options',
      '[0].min',
      '[0].mask',
      '[0].debounceMs',
      '[0].props',
      '[1].options[0]',
    ]);
    expect(
      warningsOf([{ name: 'b', type: 'select', options: [{ label: 'x' }] }]),
    ).toEqual([['[0].options[0]', 'option has no "value"']]);
  });

  it('checks groups and sections', () => {
    expect(
      errorsOf([
        {
          name: 'g',
          type: 'group',
          minItems: 3,
          maxItems: 1,
          fields: [{ type: 'text' }],
        },
        { name: 's', type: 'section', section: 'city' },
      ]),
    ).toEqual(['[0].fields[0].name', '[0].minItems', '[1].section']);
    expect(
      warningsOf([
        { name: 'g', type: 'group', fields: [], section: [] },
        { name: 'x', type: 'text', maxItems: 2 },
      ]),
    ).toEqual([
      [
        '[0].section',
        'both "fields" and "section" are set; "fields" wins and the section is ignored',
      ],
      [
        '[1].maxItems',
        '"maxItems" only applies to a repeatable group (a field with "fields")',
      ],
    ]);
  });

  it('warns about a type with no renderer when the known types are given', () => {
    const config = [
      { name: 'a', type: 'text' },
      { name: 'b', type: 'rating' },
      { name: 'g', type: 'group', fields: [] },
    ];
    expect(warningsOf(config)).toEqual([]);
    expect(warningsOf(config, ['text'])).toEqual([
      ['[1].type', 'no renderer is registered for type "rating"'],
    ]);
  });

  it('validates form data with core once the config is valid', () => {
    const config = [
      { name: 'plan', type: 'text' },
      {
        name: 'seats',
        type: 'number',
        requiredWhen: { field: 'plan', equals: 'team' },
      },
    ];

    expect(validateConfig(config, { data: { plan: 'team' } })).toEqual({
      valid: true,
      problems: [],
      dataErrors: { seats: ['Field is required'] },
    });
    expect(
      validateConfig(config, { data: { plan: 'solo' } }).dataErrors,
    ).toEqual({});
    expect(
      validateConfig([{ name: 'a' }], { data: {} }).dataErrors,
    ).toBeUndefined();

    const notAnObject = validateConfig(config, { data: [] });
    expect(notAnObject.valid).toBe(false);
    expect(notAnObject.problems[0].path).toBe('data');
  });
});
