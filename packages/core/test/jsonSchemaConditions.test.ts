import { describe, expect, it } from 'vitest';
import { evaluateCondition } from '../src/conditions';
import { fieldsFromJsonSchema } from '../src/jsonSchema';
import {
  conditionToSchema,
  schemaToCondition,
} from '../src/jsonSchemaConditions';
import { fieldsToJsonSchema } from '../src/jsonSchemaExport';
import type {
  FieldCondition,
  FieldDescription,
  Properties,
} from '../src/types';
import { validateFields } from '../src/validation';

const fields = (list: unknown[]) => list as FieldDescription[];

/** Field names with only the condition keys, for comparing round trips. */
function conditionsOf(list: FieldDescription[]): Properties[] {
  return list.map((f) => ({
    name: f.name,
    ...(f.required ? { required: true } : {}),
    ...(f.appearWhen ? { appearWhen: f.appearWhen } : {}),
    ...(f.requiredWhen ? { requiredWhen: f.requiredWhen } : {}),
    ...(f.section ? { section: conditionsOf(f.section) } : {}),
    ...(f.fields ? { fields: conditionsOf(f.fields) } : {}),
  }));
}

/**
 * A tiny evaluator for the schema subset conditions are written in, so the
 * tests can check that a written `if` means what the condition means without
 * pulling in a JSON Schema validator.
 */
function matches(schema: unknown, value: unknown): boolean {
  if (schema === true) {
    return true;
  }
  const s = schema as Record<string, unknown>;
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  if ('const' in s && !same(s.const, value)) {
    return false;
  }
  if (Array.isArray(s.enum) && !s.enum.some((v) => same(v, value))) {
    return false;
  }
  if ('not' in s && matches(s.not, value)) {
    return false;
  }
  if (Array.isArray(s.allOf) && !s.allOf.every((p) => matches(p, value))) {
    return false;
  }
  if (Array.isArray(s.anyOf) && !s.anyOf.some((p) => matches(p, value))) {
    return false;
  }
  const isObj =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const obj = value as Record<string, unknown>;
  if (Array.isArray(s.required)) {
    if (!isObj || !s.required.every((k) => (k as string) in obj)) {
      return false;
    }
  }
  if (s.properties && isObj) {
    for (const [k, sub] of Object.entries(s.properties as object)) {
      if (k in obj && !matches(sub, obj[k])) {
        return false;
      }
    }
  }
  return true;
}

describe('conditions written as JSON Schema', () => {
  const samples: Record<string, unknown>[] = [
    {},
    { country: 'US' },
    { country: 'VN' },
    { country: '' },
    { country: null },
    { country: 0 },
    { country: false },
    { country: [] },
    { country: ['US'] },
    { address: { country: 'US' } },
    { address: {} },
  ];
  const conditions: FieldCondition[] = [
    { field: 'country', equals: 'US' },
    { field: 'country', notEquals: 'US' },
    { field: 'country', in: ['US', 'CA'] },
    { field: 'country', truthy: true },
    { field: 'country', truthy: false },
    { field: 'country', empty: true },
    { field: 'country', empty: false },
    { field: 'address.country', equals: 'US' },
    { field: 'address.country', empty: true },
    {
      all: [
        { field: 'country', empty: false },
        { field: 'country', notEquals: 'VN' },
      ],
    },
    {
      any: [
        { field: 'country', equals: 'VN' },
        { field: 'country', truthy: false },
      ],
    },
    { not: { field: 'country', in: ['US'] } },
  ];

  it.each(conditions)(
    '%j means the same in the schema as in the form',
    (condition) => {
      const schema = conditionToSchema(condition, false);
      expect(schema).toBeDefined();
      for (const data of samples) {
        expect([data, matches(schema, data)]).toEqual([
          data,
          evaluateCondition(condition, data),
        ]);
      }
    },
  );

  it.each(conditions)('%j reads back as itself', (condition) => {
    expect(schemaToCondition(conditionToSchema(condition, false))).toEqual(
      condition,
    );
  });

  it('cannot write a root condition on a nested object', () => {
    expect(
      conditionToSchema({ field: 'plan', equals: 'pro', root: true }, true),
    ).toBeUndefined();
    expect(
      conditionToSchema({ field: 'plan', equals: 'pro', root: true }, false),
    ).toEqual({ required: ['plan'], properties: { plan: { const: 'pro' } } });
  });

  it('reads the hand-written forms of an if', () => {
    expect(
      schemaToCondition({ properties: { country: { const: 'US' } } }),
    ).toEqual({
      field: 'country',
      equals: 'US',
    });
    expect(
      schemaToCondition({
        properties: { country: { type: 'string', enum: ['US', 'CA'] } },
      }),
    ).toEqual({ field: 'country', in: ['US', 'CA'] });
    expect(schemaToCondition({ required: ['vat'] })).toEqual({
      field: 'vat',
      empty: false,
    });
    expect(
      schemaToCondition({
        properties: { a: { const: 1 }, b: { not: { const: 2 } } },
      }),
    ).toEqual({
      all: [
        { field: 'a', equals: 1 },
        { field: 'b', notEquals: 2 },
      ],
    });
    expect(
      schemaToCondition({ properties: { a: { minimum: 3 } } }),
    ).toBeUndefined();
    expect(schemaToCondition({ type: 'string' })).toBeUndefined();
  });
});

describe('fieldsToJsonSchema with declarative conditions', () => {
  it('writes requiredWhen as if / then required', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        { name: 'country', type: 'text' },
        {
          name: 'state',
          type: 'text',
          requiredWhen: { field: 'country', equals: 'US' },
        },
      ]),
    );
    expect(warnings).toEqual([]);
    expect(schema).toEqual({
      type: 'object',
      properties: { country: { type: 'string' }, state: { type: 'string' } },
      allOf: [
        {
          if: {
            required: ['country'],
            properties: { country: { const: 'US' } },
          },
          then: { required: ['state'] },
        },
      ],
    });
  });

  it('defines a conditionally shown field under then, keeping its place', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        { name: 'country', type: 'text' },
        {
          name: 'vat',
          type: 'text',
          label: 'VAT',
          required: true,
          appearWhen: { field: 'country', in: ['DE', 'FR'] },
        },
        { name: 'note', type: 'textarea' },
      ]),
      { strict: true, defaults: { vat: 'DE0' } },
    );
    expect(warnings).toEqual([]);
    expect(Object.keys(schema.properties as object)).toEqual([
      'country',
      'vat',
      'note',
    ]);
    expect(schema).toEqual({
      type: 'object',
      properties: {
        country: { type: 'string' },
        vat: true,
        note: { type: 'string' },
      },
      additionalProperties: false,
      allOf: [
        {
          if: {
            required: ['country'],
            properties: { country: { enum: ['DE', 'FR'] } },
          },
          then: {
            properties: {
              vat: { title: 'VAT', type: 'string', default: 'DE0' },
            },
            required: ['vat'],
          },
        },
      ],
    });
  });

  it('requires a shown field only while it is shown', () => {
    const { schema } = fieldsToJsonSchema(
      fields([
        { name: 'kind', type: 'text' },
        {
          name: 'company',
          type: 'text',
          appearWhen: { field: 'kind', equals: 'work' },
          requiredWhen: { field: 'kind', notEquals: 'draft' },
        },
      ]),
    );
    expect((schema.allOf as unknown[])[1]).toEqual({
      if: {
        allOf: [
          { required: ['kind'], properties: { kind: { const: 'work' } } },
          {
            not: {
              required: ['kind'],
              properties: { kind: { const: 'draft' } },
            },
          },
        ],
      },
      then: { required: ['company'] },
    });
  });

  it('writes conditions inside groups and sections against the nested object', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        {
          name: 'contacts',
          type: 'text',
          fields: [
            { name: 'kind', type: 'text' },
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
      ]),
    );
    const items = (schema.properties as Record<string, Record<string, unknown>>)
      .contacts.items as Record<string, unknown>;
    expect(items.allOf).toEqual([
      {
        if: { required: ['kind'], properties: { kind: { const: 'work' } } },
        then: { required: ['company'] },
      },
    ]);
    expect(warnings.map((w) => w.path)).toEqual(['contacts[].taxId']);
    expect(warnings[0].message).toContain('root: true');
  });

  it('keeps reporting appearCondition, which wins over appearWhen', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        {
          name: 'vat',
          type: 'text',
          appearCondition: () => true,
          appearWhen: { field: 'country', equals: 'DE' },
        },
      ]),
    );
    expect(schema.allOf).toBeUndefined();
    expect(warnings[0].message).toContain('overrides `appearWhen`');
  });
});

describe('fieldsFromJsonSchema with conditional keywords', () => {
  it('turns dependentRequired and draft-07 dependencies into requiredWhen', () => {
    const { fields: result, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        card: { type: 'string' },
        billing: { type: 'string' },
        cvc: { type: 'string' },
      },
      dependentRequired: { card: ['billing'] },
      dependencies: { card: ['cvc'], billing: ['cvc'] },
    });
    expect(warnings).toEqual([]);
    expect(conditionsOf(result)).toEqual([
      { name: 'card' },
      { name: 'billing', requiredWhen: { field: 'card', empty: false } },
      {
        name: 'cvc',
        requiredWhen: {
          any: [
            { field: 'card', empty: false },
            { field: 'billing', empty: false },
          ],
        },
      },
    ]);
    const cvc = result[2];
    expect(validateFields([cvc], { card: '4242' }).errors).toEqual({
      cvc: ['Field is required'],
    });
    expect(validateFields([cvc], {}).valid).toBe(true);
  });

  it('turns if / then / else on one property into requiredWhen', () => {
    const { fields: result, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        country: { type: 'string', enum: ['US', 'CA', 'VN'] },
        state: { type: 'string' },
        postcode: { type: 'string' },
      },
      if: { properties: { country: { const: 'US' } } },
      then: { required: ['state'] },
      else: { required: ['postcode'] },
    });
    expect(warnings).toEqual([]);
    expect(conditionsOf(result)).toEqual([
      { name: 'country' },
      { name: 'state', requiredWhen: { field: 'country', equals: 'US' } },
      { name: 'postcode', requiredWhen: { field: 'country', notEquals: 'US' } },
    ]);
  });

  it('shows a property defined under then only while the if holds', () => {
    const { fields: result, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: { country: { type: 'string' } },
      allOf: [
        {
          if: {
            properties: { country: { enum: ['DE', 'FR'] } },
            required: ['country'],
          },
          then: {
            properties: { vat: { type: 'string', minLength: 4 } },
            required: ['vat'],
          },
        },
        {
          if: { properties: { country: { const: 'US' } } },
          then: { properties: { ssn: { type: 'string' } } },
        },
      ],
    });
    expect(warnings).toEqual([]);
    expect(conditionsOf(result)).toEqual([
      { name: 'country' },
      {
        name: 'vat',
        required: true,
        appearWhen: { field: 'country', in: ['DE', 'FR'] },
      },
      { name: 'ssn', appearWhen: { field: 'country', equals: 'US' } },
    ]);
    // Hidden, it is not validated; shown, its rules apply.
    expect(validateFields(result, { country: 'US' }).valid).toBe(true);
    expect(validateFields(result, { country: 'DE', vat: 'x' }).errors).toEqual({
      vat: ['Minimum length is 4'],
    });
  });

  it('reports what it cannot read, as before', () => {
    const { fields: result, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: { age: { type: 'integer' }, guardian: { type: 'string' } },
      allOf: [
        {
          if: { properties: { age: { maximum: 17 } } },
          then: { required: ['guardian'] },
        },
        {
          if: { properties: { age: { const: 0 } } },
          then: {
            properties: { guardian: { minLength: 2 } },
            minProperties: 1,
          },
        },
      ],
    });
    expect(conditionsOf(result)).toEqual([
      { name: 'age' },
      { name: 'guardian' },
    ]);
    expect(warnings.map((w) => `${w.path}: ${w.message}`)).toEqual([
      '(root): "if" is not a test of property values this kit can read; its "then" and "else" are ignored',
      '(root): "then" holds "minProperties"; only "required" and the "properties" it adds are read',
      'guardian: "then" adds rules to a property that is always there; they are not applied',
    ]);
  });
});

/** Gives every field a title, so the import has none to make up. */
function labelled(list: FieldDescription[]): FieldDescription[] {
  return list.map((f) => ({
    ...f,
    label: f.name,
    ...(f.section ? { section: labelled(f.section) } : {}),
    ...(f.fields ? { fields: labelled(f.fields) } : {}),
  }));
}

describe('round trip', () => {
  const list = labelled(
    fields([
      {
        name: 'country',
        type: 'select',
        options: [
          { label: 'US', value: 'US' },
          { label: 'DE', value: 'DE' },
        ],
      },
      {
        name: 'state',
        type: 'text',
        requiredWhen: { field: 'country', equals: 'US' },
      },
      {
        name: 'vat',
        type: 'text',
        required: true,
        appearWhen: { field: 'country', in: ['DE'] },
      },
      {
        name: 'company',
        type: 'text',
        appearWhen: { field: 'country', notEquals: 'US' },
        requiredWhen: { field: 'vat', empty: false },
      },
      {
        name: 'newsletter',
        type: 'checkbox',
        appearWhen: {
          any: [
            { field: 'country', empty: true },
            { field: 'vat', truthy: false },
          ],
        },
      },
      {
        name: 'address',
        type: 'text',
        section: [
          { name: 'line', type: 'text' },
          {
            name: 'zip',
            type: 'text',
            requiredWhen: { field: 'line', empty: false },
          },
        ],
      },
      {
        name: 'contacts',
        type: 'text',
        fields: [
          { name: 'kind', type: 'text' },
          {
            name: 'company',
            type: 'text',
            appearWhen: { field: 'kind', equals: 'work' },
          },
        ],
      },
    ]),
  );

  it('reads back the conditions it writes', () => {
    const exported = fieldsToJsonSchema(list);
    expect(exported.warnings).toEqual([]);
    const imported = fieldsFromJsonSchema(exported.schema);
    expect(imported.warnings).toEqual([]);
    expect(conditionsOf(imported.fields)).toEqual(conditionsOf(list));
  });

  it('writes the same schema again from what it read', () => {
    const once = fieldsToJsonSchema(list).schema;
    const twice = fieldsToJsonSchema(fieldsFromJsonSchema(once).fields).schema;
    expect(twice).toEqual(once);
  });
});
