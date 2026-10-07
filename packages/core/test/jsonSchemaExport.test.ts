import { describe, expect, it } from 'vitest';
import { fieldsFromJsonSchema } from '../src/jsonSchema';
import { fieldsToJsonSchema } from '../src/jsonSchemaExport';
import type { FieldDescription } from '../src/types';

// The registry's field types are open-ended; these tests use plain strings.
const fields = (list: unknown[]) => list as FieldDescription[];

describe('fieldsToJsonSchema', () => {
  it('writes each built-in type with its title, description and required list, in order', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        {
          name: 'firstName',
          type: 'text',
          label: 'First name',
          required: true,
        },
        {
          name: 'bio',
          type: 'textarea',
          description: 'A few words',
          props: { maxLength: 200 },
        },
        { name: 'email', type: 'email', required: true },
        { name: 'secret', type: 'password' },
        { name: 'site', type: 'url' },
        { name: 'birthday', type: 'date' },
        { name: 'alarm', type: 'time' },
        { name: 'startsAt', type: 'datetime-local' },
        { name: 'agree', type: 'checkbox' },
        { name: 'notify', type: 'switch' },
      ]),
      { title: 'Profile', description: 'What the form collects' },
    );

    expect(warnings).toEqual([]);
    expect(schema).toEqual({
      title: 'Profile',
      description: 'What the form collects',
      type: 'object',
      properties: {
        firstName: { title: 'First name', type: 'string' },
        bio: { description: 'A few words', type: 'string', maxLength: 200 },
        email: { type: 'string', format: 'email' },
        secret: { type: 'string', format: 'password' },
        site: { type: 'string', format: 'uri' },
        birthday: { type: 'string', format: 'date' },
        alarm: { type: 'string', format: 'time' },
        startsAt: { type: 'string', format: 'date-time' },
        agree: { type: 'boolean' },
        notify: { type: 'boolean' },
      },
      required: ['firstName', 'email'],
    });
    expect(Object.keys(schema.properties as object)).toEqual([
      'firstName',
      'bio',
      'email',
      'secret',
      'site',
      'birthday',
      'alarm',
      'startsAt',
      'agree',
      'notify',
    ]);
  });

  it('reads numeric bounds, and calls a whole step from whole bounds an integer', () => {
    const { schema } = fieldsToJsonSchema(
      fields([
        { name: 'age', type: 'number', min: 18, max: '120', step: 1 },
        { name: 'price', type: 'number', min: 0, step: 0.01 },
        { name: 'volume', type: 'range', min: 0, max: 100, step: 5 },
        { name: 'offset', type: 'number', min: 0.5, step: 1 },
        { name: 'anything', type: 'number' },
      ]),
    );

    expect(schema.properties).toEqual({
      age: { type: 'integer', minimum: 18, maximum: 120 },
      price: { type: 'number', minimum: 0, multipleOf: 0.01 },
      volume: { type: 'integer', minimum: 0, maximum: 100, multipleOf: 5 },
      offset: { type: 'number', minimum: 0.5, multipleOf: 1 },
      anything: { type: 'number' },
    });
  });

  it('writes options as an enum, or as titled constants when the labels say more', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        {
          name: 'plan',
          type: 'select',
          options: [
            { label: 'free', value: 'free' },
            { label: 'pro', value: 'pro' },
          ],
        },
        {
          name: 'country',
          type: 'radio',
          options: [
            { label: 'Viet Nam', value: 'vn' },
            { label: 'Japan', value: 'jp' },
            { value: 'other' },
          ],
        },
        {
          name: 'tags',
          type: 'select',
          multiple: true,
          options: [{ label: 'a', value: 'a' }, { value: { nested: true } }],
        },
        { name: 'city', type: 'select', options: () => [] },
        { name: 'empty', type: 'select' },
      ]),
    );

    expect(schema.properties).toEqual({
      plan: { enum: ['free', 'pro'] },
      country: {
        oneOf: [
          { const: 'vn', title: 'Viet Nam' },
          { const: 'jp', title: 'Japan' },
          { const: 'other' },
        ],
      },
      tags: { type: 'array', items: { enum: ['a'] }, uniqueItems: true },
      city: {},
      empty: {},
    });
    expect(warnings.map((warning) => warning.path)).toEqual(['tags', 'city']);
    expect(warnings[1].message).toMatch(/options come from a function/);
  });

  it('writes a repeatable group as an array of objects, with its own required list', () => {
    const { schema } = fieldsToJsonSchema(
      fields([
        {
          name: 'contacts',
          type: 'group',
          minItems: 1,
          maxItems: 3,
          defaultItem: { kind: 'home' },
          fields: [
            { name: 'kind', type: 'text' },
            { name: 'phone', type: 'tel', required: true },
          ],
        },
      ]),
      { strict: true },
    );

    expect(schema).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        contacts: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              kind: { type: 'string', default: 'home' },
              phone: { type: 'string' },
            },
            required: ['phone'],
          },
        },
      },
    });
  });

  it('records defaults, and lets overrides and custom types have the last word', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        { name: 'username', type: 'text' },
        { name: 'stars', type: 'rating', label: 'Stars' },
        { name: 'mystery', type: 'signature' },
        {
          name: 'people',
          type: 'group',
          fields: [{ name: 'nick', type: 'text' }],
        },
      ]),
      {
        defaults: { username: 'guest', stars: 3, unknownKey: 1 },
        types: { rating: { type: 'integer', minimum: 1, maximum: 5 } },
        overrides: {
          username: { minLength: 3, pattern: '^[a-z]+$', default: 'anon' },
          'people[].nick': { maxLength: 12 },
        },
      },
    );

    expect(schema.properties).toEqual({
      username: {
        type: 'string',
        minLength: 3,
        pattern: '^[a-z]+$',
        default: 'anon',
      },
      stars: {
        title: 'Stars',
        type: 'integer',
        minimum: 1,
        maximum: 5,
        default: 3,
      },
      mystery: {},
      people: {
        type: 'array',
        items: {
          type: 'object',
          properties: { nick: { type: 'string', maxLength: 12 } },
        },
      },
    });
    expect(warnings).toEqual([
      {
        path: 'mystery',
        message:
          'type "signature" is not a built-in; the schema accepts any value. Describe it through `types`',
      },
    ]);
  });

  it('says what a function holds instead of dropping it silently', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      fields([
        { name: 'total', type: 'number', computeValue: () => 1 },
        { name: 'vat', type: 'text', appearCondition: () => true },
        { name: 'code', type: 'text', validate: () => undefined },
        { name: 'locked', type: 'text', readOnlyCondition: () => true },
        { name: 'avatar', type: 'file', required: true },
        { name: 'code', type: 'number' },
      ]),
    );

    expect(schema.properties).toEqual({
      total: { type: 'number', readOnly: true },
      vat: { type: 'string' },
      code: { type: 'string' },
      locked: { type: 'string' },
    });
    expect(schema.required).toBeUndefined();
    expect(
      warnings.map((warning) => `${warning.path}: ${warning.message}`),
    ).toEqual([
      'vat: `appearCondition` is a function and is not in the schema; the property is always allowed',
      'code: `validate` is a function and is not in the schema; add its rules through `overrides`',
      'locked: `readOnlyCondition` is a function and is not in the schema',
      'avatar: a file has no JSON value; the property is left out',
      'code: a field of this name is already in the schema; this one is skipped',
    ]);
  });

  it('gives back the shape of a schema that was turned into fields', () => {
    const original = {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', title: 'Email' },
        age: { type: 'integer', minimum: 18, title: 'Age' },
        plan: { enum: ['free', 'pro'], default: 'free', title: 'Plan' },
        contacts: {
          type: 'array',
          title: 'Contacts',
          items: {
            type: 'object',
            properties: { phone: { type: 'string', title: 'Phone' } },
          },
        },
      },
    };
    const imported = fieldsFromJsonSchema(original);

    const { schema } = fieldsToJsonSchema(imported.fields, {
      defaults: imported.defaults,
    });

    expect(schema).toEqual(original);
  });

  it('rejects something that is not a field list', () => {
    expect(() =>
      fieldsToJsonSchema({} as unknown as FieldDescription[]),
    ).toThrow(TypeError);
  });
});
