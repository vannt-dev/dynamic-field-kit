import { describe, expect, it } from 'vitest';
import { isFieldGroup, isFieldSection } from '../src/fieldGroup';
import { fieldsFromJsonSchema } from '../src/jsonSchema';
import { fieldsToJsonSchema } from '../src/jsonSchemaExport';
import { sectionPathMap } from '../src/pathMaps';
import { serverErrorsFrom } from '../src/serverErrors';
import type { FieldDescription, Properties } from '../src/types';
import {
  collectFieldPaths,
  validateFields,
  validateFieldsAsync,
} from '../src/validation';
import { validators } from '../src/validators';

// The registry's field types are open-ended; these tests use plain strings.
const list = (fields: unknown[]) => fields as FieldDescription[];

const address: FieldDescription = {
  name: 'address',
  type: 'text',
  label: 'Address',
  section: [
    { name: 'street', type: 'text', validate: validators.required() },
    { name: 'city', type: 'text' },
  ],
};

const person: FieldDescription[] = [
  { name: 'name', type: 'text', validate: validators.required() },
  address,
];

describe('isFieldSection', () => {
  it('is a field with a list of fields under `section`', () => {
    expect(isFieldSection(address)).toBe(true);
    expect(isFieldSection({ name: 'name', type: 'text' })).toBe(false);
    expect(isFieldGroup(address)).toBe(false);
  });

  it('leaves a repeatable group a repeatable group', () => {
    const group: FieldDescription = {
      name: 'contacts',
      type: 'text',
      fields: [{ name: 'email', type: 'text' }],
    };
    expect(isFieldSection(group)).toBe(false);
    // Both keys at once: the group is what older adapters already render.
    expect(isFieldSection({ ...group, section: [] })).toBe(false);
  });
});

describe('validateFields with a section', () => {
  it('reports a field of the section under the section name', () => {
    const result = validateFields(person, {
      name: 'Ada',
      address: { city: 'Hue' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      'address.street': ['Field is required'],
    });
  });

  it('is valid once the section is filled in', () => {
    expect(
      validateFields(person, {
        name: 'Ada',
        address: { street: '1 Le Loi', city: 'Hue' },
      }).errors,
    ).toEqual({});
  });

  it('reads a section that has no data yet as an empty one', () => {
    for (const data of [
      { name: 'Ada' },
      { name: 'Ada', address: null },
      { name: 'Ada', address: 'not an object' },
      { name: 'Ada', address: ['nor', 'this'] },
    ]) {
      expect(validateFields(person, data as Properties).errors).toEqual({
        'address.street': ['Field is required'],
      });
    }
  });

  it('gives a nested rule the section as its data and the form as its root', () => {
    const seen: unknown[][] = [];
    const fields = list([
      {
        name: 'address',
        type: 'text',
        section: [
          {
            name: 'zip',
            type: 'text',
            validate: (value: unknown, data: Properties, root?: Properties) => {
              seen.push([value, data, root]);
              return undefined;
            },
          },
        ],
      },
    ]);
    const data = { country: 'VN', address: { zip: '530000' } };
    validateFields(fields, data);
    expect(seen).toEqual([['530000', { zip: '530000' }, data]]);
  });

  it('skips a section that is hidden or disabled', () => {
    const hidden = list([
      {
        ...address,
        appearCondition: (data: Properties) => data.ships === true,
      },
    ]);
    expect(validateFields(hidden, { ships: false }).errors).toEqual({});
    expect(validateFields(hidden, { ships: true }).errors).toEqual({
      'address.street': ['Field is required'],
    });
    expect(
      validateFields(list([{ ...address, disabled: true }]), {}).errors,
    ).toEqual({});
  });

  it('applies the conditions of the fields inside it to the section data', () => {
    const fields = list([
      {
        name: 'address',
        type: 'text',
        section: [
          { name: 'country', type: 'text' },
          {
            name: 'state',
            type: 'text',
            validate: validators.required(),
            appearCondition: (data: Properties) => data.country === 'US',
          },
        ],
      },
    ]);
    expect(
      validateFields(fields, { address: { country: 'VN' } }).errors,
    ).toEqual({});
    expect(
      validateFields(fields, { address: { country: 'US' } }).errors,
    ).toEqual({ 'address.state': ['Field is required'] });
  });

  it('nests inside a repeatable group and inside another section', () => {
    const fields = list([
      { name: 'contacts', type: 'text', fields: [address] },
      { name: 'billing', type: 'text', section: [address] },
    ]);
    const result = validateFields(fields, {
      contacts: [{ address: { street: 'x' } }, {}],
      billing: {},
    });
    expect(result.errors).toEqual({
      'contacts[1].address.street': ['Field is required'],
      'billing.address.street': ['Field is required'],
    });
  });

  it('lists a nested asynchronous rule as pending under its path', () => {
    const fields = list([
      {
        name: 'address',
        type: 'text',
        section: [
          { name: 'zip', type: 'text', validate: async () => 'Unknown zip' },
        ],
      },
    ]);
    const result = validateFields(fields, { address: { zip: '1' } });
    expect(result.pending).toEqual(['address.zip']);
    expect(result.status).toBe('pending');
  });
});

describe('validateFieldsAsync with a section', () => {
  it('awaits the rules inside the section', async () => {
    const fields = list([
      {
        name: 'address',
        type: 'text',
        section: [
          { name: 'street', type: 'text', validate: validators.required() },
          { name: 'zip', type: 'text', validate: async () => 'Unknown zip' },
        ],
      },
    ]);
    const result = await validateFieldsAsync(fields, { address: { zip: '1' } });
    expect(result.errors).toEqual({
      'address.street': ['Field is required'],
      'address.zip': ['Unknown zip'],
    });
  });
});

describe('collectFieldPaths with a section', () => {
  it('lists the fields of the section, not the section', () => {
    expect(collectFieldPaths(person, {})).toEqual([
      'name',
      'address.street',
      'address.city',
    ]);
  });

  it('gives a backend answer its place inside the section', () => {
    const paths = collectFieldPaths(person, {});
    expect(
      serverErrorsFrom(
        { errors: { 'Address.Street': ['No such street'] } },
        { paths },
      ),
    ).toEqual({ 'address.street': ['No such street'] });
    expect(
      serverErrorsFrom({
        errors: [{ pointer: '/address/street', detail: 'No such street' }],
      }),
    ).toEqual({ 'address.street': ['No such street'] });
  });
});

describe('sectionPathMap', () => {
  it('keeps the entries of one section, keyed from inside it', () => {
    expect(
      sectionPathMap(
        {
          name: ['a'],
          address: ['b'],
          'address.street': ['c'],
          'address.geo.lat': ['d'],
          'addressLine.street': ['e'],
          'contacts[0].address.street': ['f'],
        },
        'address',
      ),
    ).toEqual({ street: ['c'], 'geo.lat': ['d'] });
  });

  it('keeps an absent map absent, so a form stays uncontrolled', () => {
    expect(sectionPathMap(undefined, 'address')).toBeUndefined();
    expect(sectionPathMap({}, 'address')).toEqual({});
  });
});

describe('fieldsFromJsonSchema with a nested object', () => {
  it('turns it into a section', () => {
    const { fields, defaults, warnings } = fieldsFromJsonSchema({
      type: 'object',
      required: ['address'],
      properties: {
        name: { type: 'string' },
        address: {
          type: 'object',
          title: 'Where to send it',
          required: ['street'],
          properties: {
            street: { type: 'string' },
            country: { type: 'string', default: 'VN' },
            geo: {
              type: 'object',
              properties: { lat: { type: 'number' } },
            },
          },
        },
      },
    });
    expect(warnings).toEqual([]);
    const section = fields.find((field) => field.name === 'address')!;
    expect(isFieldSection(section)).toBe(true);
    expect(section.label).toBe('Where to send it');
    expect(section.required).toBe(true);
    expect(
      section.section?.map((field) => [field.name, field.type, field.required]),
    ).toEqual([
      ['street', 'text', true],
      ['country', 'text', undefined],
      ['geo', 'text', undefined],
    ]);
    expect(isFieldSection(section.section![2]!)).toBe(true);
    expect(defaults).toEqual({ address: { country: 'VN' } });
    // The rules of the nested properties are the ones that speak.
    expect(validateFields(fields, { address: {} }).errors).toEqual({
      'address.street': ['Field is required'],
    });
  });

  it('says so when the object lists no properties', () => {
    const { fields, warnings } = fieldsFromJsonSchema({
      type: 'object',
      properties: { extra: { type: 'object' } },
    });
    expect(fields).toEqual([]);
    expect(warnings).toEqual([
      {
        path: 'extra',
        message:
          'an object without "properties" has no field; list its properties or leave it out',
      },
    ]);
  });
});

describe('fieldsToJsonSchema with a section', () => {
  it('writes it as an object with its own properties and required list', () => {
    const { schema, warnings } = fieldsToJsonSchema(
      list([
        { name: 'name', type: 'text' },
        {
          name: 'address',
          type: 'text',
          label: 'Address',
          required: true,
          section: [
            { name: 'street', type: 'text', required: true },
            { name: 'floor', type: 'number', step: 1 },
          ],
        },
      ]),
      { defaults: { address: { floor: 1 } }, strict: true },
    );
    expect(warnings).toEqual([]);
    expect(schema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['address'],
      properties: {
        name: { type: 'string' },
        address: {
          type: 'object',
          title: 'Address',
          additionalProperties: false,
          required: ['street'],
          properties: {
            street: { type: 'string' },
            floor: { type: 'integer', default: 1 },
          },
        },
      },
    });
  });

  it('gives back the sections of a schema that was turned into fields', () => {
    const original = {
      type: 'object',
      required: ['address'],
      properties: {
        name: { type: 'string', title: 'Name' },
        address: {
          type: 'object',
          title: 'Address',
          required: ['street'],
          properties: {
            street: { type: 'string', title: 'Street' },
            country: { type: 'string', title: 'Country', default: 'VN' },
          },
        },
        contacts: {
          type: 'array',
          title: 'Contacts',
          items: {
            type: 'object',
            properties: {
              home: {
                type: 'object',
                title: 'Home',
                properties: { city: { type: 'string', title: 'City' } },
              },
            },
          },
        },
      },
    };
    const imported = fieldsFromJsonSchema(original);
    expect(imported.warnings).toEqual([]);
    const { schema } = fieldsToJsonSchema(imported.fields, {
      defaults: imported.defaults,
    });
    expect(schema).toEqual(original);
  });
});
