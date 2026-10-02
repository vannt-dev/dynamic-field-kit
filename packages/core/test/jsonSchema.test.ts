import { describe, expect, it } from 'vitest';
import { isFieldGroup } from '../src/fieldGroup';
import { fieldsFromJsonSchema } from '../src/jsonSchema';
import { createMessageResolver } from '../src/messages';
import type { FieldDescription } from '../src/types';
import { validateFields } from '../src/validation';

function field(fields: FieldDescription[], name: string): FieldDescription {
  const found = fields.find((item) => item.name === name);
  if (!found) {
    throw new Error(`no field named ${name}`);
  }
  return found;
}

function errorsFor(
  target: FieldDescription,
  value: unknown,
): string[] | undefined {
  const result = target.validate?.(value, {});
  return result as string[] | undefined;
}

describe('fieldsFromJsonSchema', () => {
  it('maps primitive types, formats and titles in property order', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        last_name: {
          type: 'string',
          title: 'Family name',
          description: 'As on your passport',
        },
        contactEmail: { type: 'string', format: 'email' },
        secret: { type: 'string', format: 'password' },
        birthday: { type: 'string', format: 'date' },
        alarm: { type: 'string', format: 'time' },
        startsAt: { type: 'string', format: 'date-time' },
        website: { type: 'string', format: 'uri' },
        age: { type: 'integer' },
        score: { type: 'number' },
        subscribed: { type: 'boolean' },
      },
    });

    expect(warnings).toEqual([]);
    expect(fields.map((item) => [item.name, item.type, item.label])).toEqual([
      ['firstName', 'text', 'First name'],
      ['last_name', 'text', 'Family name'],
      ['contactEmail', 'email', 'Contact email'],
      ['secret', 'password', 'Secret'],
      ['birthday', 'date', 'Birthday'],
      ['alarm', 'time', 'Alarm'],
      ['startsAt', 'datetime-local', 'Starts at'],
      ['website', 'text', 'Website'],
      ['age', 'number', 'Age'],
      ['score', 'number', 'Score'],
      ['subscribed', 'checkbox', 'Subscribed'],
    ]);
    expect(field(fields, 'last_name').description).toBe('As on your passport');
    expect(field(fields, 'age').step).toBe(1);
    expect(field(fields, 'score').step).toBeUndefined();
    expect(field(fields, 'firstName').validate).toBeUndefined();
  });

  it('turns `required` into the flag and a validator', () => {
    const { fields } = fieldsFromJsonSchema({
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, nickname: { type: 'string' } },
    });

    expect(field(fields, 'name').required).toBe(true);
    expect(errorsFor(field(fields, 'name'), '')).toEqual(['Field is required']);
    expect(errorsFor(field(fields, 'name'), 'Ada')).toBeUndefined();
    expect(field(fields, 'nickname').required).toBeUndefined();
  });

  it('enforces string limits and patterns through the built-in validators', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        code: {
          type: 'string',
          minLength: 2,
          maxLength: 4,
          pattern: '^[A-Z]+$',
        },
        email: { type: 'string', format: 'email' },
        // Valid without the `u` flag only.
        slug: { type: 'string', pattern: '^[a-z\\-]+$' },
        broken: { type: 'string', pattern: '([' },
        open: { type: 'string', minLength: 0 },
      },
    });

    const code = field(fields, 'code');
    expect(code.props).toEqual({ maxLength: 4 });
    expect(errorsFor(code, 'a')).toEqual([
      'Minimum length is 2',
      'Invalid format',
    ]);
    expect(errorsFor(code, 'ABCDE')).toEqual(['Maximum length is 4']);
    expect(errorsFor(code, 'ABC')).toBeUndefined();
    expect(errorsFor(field(fields, 'email'), 'nope')).toEqual([
      'Invalid email address',
    ]);
    expect(errorsFor(field(fields, 'slug'), 'a-b')).toBeUndefined();
    expect(errorsFor(field(fields, 'slug'), 'A')).toEqual(['Invalid format']);
    expect(field(fields, 'broken').validate).toBeUndefined();
    expect(field(fields, 'open').validate).toBeUndefined();
    expect(warnings).toEqual([
      {
        path: 'broken',
        message: '"pattern" ([ is not a valid regular expression; not enforced',
      },
    ]);
  });

  it('maps numeric bounds to attributes and validators, and reports exclusive bounds', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        quantity: { type: 'integer', minimum: 1, maximum: 10 },
        price: {
          type: 'number',
          multipleOf: 0.01,
          exclusiveMinimum: 0,
          exclusiveMaximum: 100,
        },
      },
    });

    const quantity = field(fields, 'quantity');
    expect([quantity.min, quantity.max, quantity.step]).toEqual([1, 10, 1]);
    expect(errorsFor(quantity, 0)).toEqual(['Minimum value is 1']);
    expect(errorsFor(quantity, 11)).toEqual(['Maximum value is 10']);
    expect(field(fields, 'price').step).toBe(0.01);
    expect(warnings.map((item) => item.path)).toEqual(['price', 'price']);
    expect(warnings[0].message).toContain('exclusiveMinimum');
  });

  it('builds select options from enum and from constant oneOf/anyOf', () => {
    const { fields } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        size: { type: 'string', enum: ['s', 'm', null] },
        level: { enum: [1, 2] },
        plan: {
          oneOf: [
            { const: 'free', title: 'Free' },
            { const: 'pro', title: 'Pro (billed yearly)' },
            { const: null },
          ],
        },
        colour: { anyOf: [{ const: 'red' }, { const: 'blue' }] },
      },
    });

    expect(field(fields, 'size')).toMatchObject({
      type: 'select',
      options: [
        { label: 's', value: 's' },
        { label: 'm', value: 'm' },
      ],
    });
    expect(field(fields, 'level').options).toEqual([
      { label: '1', value: 1 },
      { label: '2', value: 2 },
    ]);
    expect(field(fields, 'plan').options).toEqual([
      { label: 'Free', value: 'free' },
      { label: 'Pro (billed yearly)', value: 'pro' },
    ]);
    expect(field(fields, 'colour').options).toEqual([
      { label: 'red', value: 'red' },
      { label: 'blue', value: 'blue' },
    ]);
  });

  it('reads nullable types written either way', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        middleName: { type: ['string', 'null'] },
        age: {
          anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
          title: 'Age (optional)',
        },
        nickname: { oneOf: [{ type: 'null' }, { $ref: '#/$defs/short' }] },
      },
      $defs: { short: { type: 'string', maxLength: 8 } },
    });

    expect(warnings).toEqual([]);
    expect(field(fields, 'middleName').type).toBe('text');
    expect(field(fields, 'age')).toMatchObject({
      type: 'number',
      min: 0,
      label: 'Age (optional)',
    });
    expect(field(fields, 'nickname').props).toEqual({ maxLength: 8 });
  });

  it('turns an array of objects into a repeatable group', () => {
    const { fields, defaults, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          title: 'Contacts',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' },
              kind: { enum: ['work', 'home'], default: 'work' },
              address: {
                type: 'object',
                properties: { city: { type: 'string' } },
              },
            },
          },
        },
        tags: {
          type: 'array',
          items: { type: 'object', properties: { label: { type: 'string' } } },
        },
      },
    });

    const contacts = field(fields, 'contacts');
    expect(isFieldGroup(contacts)).toBe(true);
    expect(contacts).toMatchObject({
      label: 'Contacts',
      minItems: 1,
      maxItems: 3,
    });
    expect(
      contacts.fields?.map((item) => [item.name, item.type, item.required]),
    ).toEqual([
      ['email', 'email', true],
      ['kind', 'select', undefined],
    ]);
    expect(contacts.defaultItem).toEqual({ kind: 'work' });
    expect(defaults).toEqual({ contacts: [{ kind: 'work' }] });
    expect(field(fields, 'tags').defaultItem).toBeUndefined();
    expect(field(fields, 'tags').minItems).toBeUndefined();
    expect(warnings).toEqual([
      {
        path: 'contacts[].address',
        message:
          'nested objects have no field; flatten the schema or describe the object as an array of one item',
      },
    ]);
  });

  it('turns an array of enums into a multi-select with length checks', () => {
    const { fields } = fieldsFromJsonSchema({
      type: 'object',
      required: ['roles'],
      properties: {
        roles: {
          type: 'array',
          minItems: 1,
          maxItems: 2,
          items: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
        },
        flags: { type: 'array', minItems: 0, items: { enum: ['a', 'b'] } },
      },
    });

    const roles = field(fields, 'roles');
    expect(roles).toMatchObject({ type: 'select', multiple: true });
    expect(roles.options).toHaveLength(3);
    expect(errorsFor(roles, [])).toEqual(['Field is required']);
    expect(errorsFor(roles, ['admin', 'editor', 'viewer'])).toEqual([
      'Maximum length is 2',
    ]);
    expect(errorsFor(roles, ['admin'])).toBeUndefined();
    expect(field(fields, 'flags').validate).toBeUndefined();
  });

  it('follows local $ref and merges allOf', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      $ref: '#/definitions/Person',
      definitions: {
        Name: { type: 'string', minLength: 1, title: 'Name' },
        Base: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        Person: {
          allOf: [
            { $ref: '#/definitions/Base' },
            {
              required: ['name'],
              properties: {
                name: { $ref: '#/definitions/Name', title: 'Full name' },
                'a/b~c': { $ref: '#/definitions/weird~1key~0' },
              },
            },
          ],
        },
        'weird/key~': { type: 'boolean' },
      },
    });

    expect(warnings).toEqual([]);
    expect(
      fields.map((item) => [item.name, item.type, item.required, item.label]),
    ).toEqual([
      ['id', 'number', true, 'Id'],
      ['name', 'text', true, 'Full name'],
      ['a/b~c', 'checkbox', undefined, 'A/b~c'],
    ]);
    expect(errorsFor(field(fields, 'name'), '')).toEqual(['Field is required']);
  });

  it('reports what it cannot turn into a field instead of guessing', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        ok: true,
        never: false,
        address: { type: 'object', properties: { city: { type: 'string' } } },
        nothing: { type: 'null' },
        untyped: {},
        mixed: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        remote: { $ref: 'https://example.com/schema.json' },
        missing: { $ref: '#/$defs/absent' },
        deep: { $ref: '#/$defs/absent/child' },
        loop: { $ref: '#/$defs/loop' },
        tuple: { type: 'array', items: [{ type: 'string' }] },
        prefix: { type: 'array', prefixItems: [{ type: 'string' }] },
        bare: { type: 'array' },
        words: { type: 'array', items: { type: 'string' } },
        junk: 42,
      },
      $defs: { loop: { $ref: '#/$defs/loop' } },
    });

    expect(fields).toEqual([]);
    expect(warnings.map((item) => item.path)).toEqual([
      'ok',
      'never',
      'address',
      'nothing',
      'untyped',
      'mixed',
      'remote',
      'missing',
      'deep',
      'loop',
      'tuple',
      'prefix',
      'bare',
      'words',
    ]);
    const message = (path: string) =>
      warnings.find((item) => item.path === path)?.message;
    expect(message('never')).toContain('never valid');
    expect(message('nothing')).toBe('type "null" has no field');
    expect(message('remote')).toContain('is not local');
    expect(message('missing')).toContain('does not resolve');
    expect(message('loop')).toContain('circular');
    expect(message('words')).toContain('free-form');
  });

  it('collects defaults and marks readOnly properties', () => {
    const { fields, defaults } = fieldsFromJsonSchema({
      type: 'object',
      properties: {
        country: { type: 'string', default: 'VN', readOnly: true },
        newsletter: { type: 'boolean', default: false },
        items: {
          type: 'array',
          default: [],
          minItems: 2,
          items: { type: 'object', properties: { sku: { type: 'string' } } },
        },
        plain: { type: 'string' },
      },
    });

    expect(defaults).toEqual({ country: 'VN', newsletter: false, items: [] });
    expect(field(fields, 'country').readOnlyCondition?.({})).toBe(true);
    expect(field(fields, 'plain').readOnlyCondition).toBeUndefined();
  });

  it('applies overrides by path, including inside a group', () => {
    const appear = () => false;
    const { fields } = fieldsFromJsonSchema(
      {
        type: 'object',
        required: ['bio'],
        properties: {
          bio: { type: 'string' },
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: { phone: { type: 'string' } },
            },
          },
        },
      },
      {
        overrides: {
          bio: {
            type: 'textarea',
            label: 'About you',
            appearCondition: appear,
          },
          'contacts[].phone': { placeholder: '+84…' },
          unknown: { label: 'ignored' },
        },
      },
    );

    expect(field(fields, 'bio')).toMatchObject({
      type: 'textarea',
      label: 'About you',
      required: true,
      appearCondition: appear,
    });
    expect(field(fields, 'contacts').fields?.[0].placeholder).toBe('+84…');
    expect(fields).toHaveLength(2);
  });

  it('produces fields the validation engine and message catalog accept', () => {
    const { fields } = fieldsFromJsonSchema({
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
        people: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' } },
          },
        },
      },
    });

    const result = validateFields(
      fields,
      { email: 'nope', people: [{ name: '' }] },
      undefined,
      {
        t: createMessageResolver({
          required: 'Bắt buộc',
          email: 'Email không hợp lệ',
        }),
      },
    );

    expect(result.errors).toEqual({
      email: ['Email không hợp lệ'],
      'people[0].name': ['Bắt buộc'],
    });
  });

  it('rejects a schema that is not an object with properties', () => {
    expect(() => fieldsFromJsonSchema(true)).toThrow(TypeError);
    expect(() => fieldsFromJsonSchema({ type: 'string' })).toThrow(
      'type "object"',
    );
    expect(() =>
      fieldsFromJsonSchema({ $ref: 'https://example.com/a.json' }),
    ).toThrow(TypeError);
    expect(fieldsFromJsonSchema({ type: 'object' })).toEqual({
      fields: [],
      defaults: {},
      warnings: [],
    });
    expect(fieldsFromJsonSchema({ properties: {} }).fields).toEqual([]);
  });
});
