import { describe, expect, it } from 'vitest';
import { fieldsFromOpenApi, type OpenApiDocument } from '../src/openApi';
import type { FieldDescription } from '../src/types';
import { petstore30, petstore31 } from './fixtures/petstore';

function field(fields: FieldDescription[], name: string): FieldDescription {
  const found = fields.find((item) => item.name === name);
  if (!found) {
    throw new Error(`no field named ${name}`);
  }
  return found;
}

const names = (fields: FieldDescription[] | undefined) =>
  (fields ?? []).map((item) => item.name);

describe('fieldsFromOpenApi on OpenAPI 3.0', () => {
  it('reads the JSON request body of an operation by operationId', () => {
    const { fields, defaults, warnings } = fieldsFromOpenApi(petstore30, {
      operationId: 'createPet',
    });

    expect(
      fields.map((item) => [item.name, item.type, item.required ?? false]),
    ).toEqual([
      ['name', 'text', true],
      ['status', 'select', true],
      ['ownerEmail', 'email', false],
      ['birthday', 'date', false],
      ['lastVisit', 'datetime-local', false],
      ['homepage', 'text', false],
      ['nickname', 'text', false],
      ['weight', 'number', false],
      ['category', 'text', false],
      ['tags', 'text', false],
    ]);
    expect(field(fields, 'status').options).toEqual([
      { label: 'available', value: 'available' },
      { label: 'pending', value: 'pending' },
      { label: 'sold', value: 'sold' },
    ]);
    expect(field(fields, 'name').props).toEqual({ maxLength: 40 });
    expect(field(fields, 'name').validate?.('', {})).toBeTruthy();
    expect(field(fields, 'ownerEmail').validate?.('nope', {})).toBeTruthy();
    expect(field(fields, 'ownerEmail').validate?.('a@b.co', {})).toBeFalsy();
    expect(defaults).toEqual({ status: 'available' });
    // 3.0 writes an exclusive bound as `exclusiveMinimum: true` beside it.
    expect(field(fields, 'weight').min).toBe(0);
    expect(warnings).toEqual([
      {
        path: 'weight',
        message:
          '"exclusiveMinimum" is not enforced; add a validator through `overrides`',
      },
    ]);
  });

  it('follows $ref, nullable allOf and arrays of objects into the components', () => {
    const { fields } = fieldsFromOpenApi(petstore30, {
      operationId: 'createPet',
    });

    // `nullable: true` + `allOf: [$ref]`, the 3.0 way to make a $ref nullable.
    // The readOnly `id` of the category is left out.
    expect(names(field(fields, 'category').section)).toEqual(['name']);
    const tags = field(fields, 'tags');
    expect(names(tags.fields)).toEqual(['label']);
    expect(tags.fields?.[0].required).toBe(true);
  });

  it('leaves readOnly properties out of a request body, required or not', () => {
    const { fields, warnings } = fieldsFromOpenApi(petstore30, {
      operationId: 'updatePet',
    });

    expect(names(fields)).not.toContain('id');
    expect(names(fields)).not.toContain('createdAt');
    expect(names(fields)).toContain('name');
    expect(warnings.map((warning) => warning.path)).toEqual(['weight']);
  });

  it('keeps readOnly properties as locked fields with keepReadOnly', () => {
    const { fields } = fieldsFromOpenApi(
      petstore30,
      { operationId: 'updatePet' },
      { keepReadOnly: true },
    );

    expect(field(fields, 'id').readOnlyCondition?.({})).toBe(true);
    expect(field(fields, 'createdAt').type).toBe('datetime-local');
    expect(names(field(fields, 'category').section)).toEqual(['id', 'name']);
  });

  it('finds an operation by path and method, and reads a +json media type', () => {
    const { fields } = fieldsFromOpenApi(petstore30, {
      path: '/pets/{petId}',
      method: 'PATCH',
    });

    expect(names(fields)).toEqual(['name']);
  });

  it('reads another media type when asked to', () => {
    const { fields } = fieldsFromOpenApi(
      petstore30,
      { operationId: 'uploadPhoto' },
      { mediaType: 'multipart/form-data' },
    );

    expect(names(fields)).toEqual(['file']);
  });

  it('builds from a schema under components.schemas', () => {
    const { fields } = fieldsFromOpenApi(petstore30, { schema: 'Pet' });

    expect(names(fields)).toEqual([
      'name',
      'status',
      'ownerEmail',
      'birthday',
      'lastVisit',
      'homepage',
      'nickname',
      'weight',
      'category',
      'tags',
    ]);
  });

  it('passes overrides through, keyed by property path', () => {
    const { fields } = fieldsFromOpenApi(
      petstore30,
      { schema: 'NewPet' },
      {
        overrides: {
          homepage: { type: 'textarea' },
          'tags[].label': { label: 'Tag' },
        },
      },
    );

    expect(field(fields, 'homepage').type).toBe('textarea');
    expect(field(fields, 'tags').fields?.[0].label).toBe('Tag');
  });

  it('reports a $ref to another file inside a schema as a warning', () => {
    const { fields, warnings } = fieldsFromOpenApi(petstore30, {
      schema: 'Owner',
    });

    expect(names(fields)).toEqual(['name']);
    expect(warnings).toEqual([
      {
        path: 'address',
        message:
          '"$ref" common.yaml#/Address is not local; only "#/..." references are followed',
      },
    ]);
  });
});

describe('fieldsFromOpenApi on OpenAPI 3.1', () => {
  it('reads type arrays, numeric exclusive bounds and a path item $ref', () => {
    const { fields, warnings } = fieldsFromOpenApi(petstore31, {
      path: '/pets',
      method: 'post',
    });

    expect(fields.map((item) => [item.name, item.type])).toEqual([
      ['name', 'text'],
      ['status', 'select'],
      ['nickname', 'text'],
      ['ownerEmail', 'email'],
      ['weight', 'number'],
      ['address', 'text'],
    ]);
    // `null` in the enum of a nullable type is not a choice.
    expect(field(fields, 'status').options).toHaveLength(3);
    expect(field(fields, 'nickname').props).toEqual({ maxLength: 12 });
    expect(field(fields, 'name').validate?.('', {})).toBeTruthy();
    const address = field(fields, 'address');
    expect(names(address.section)).toEqual(['street', 'city']);
    expect(address.section?.[1].required).toBe(true);
    expect(warnings).toEqual([
      {
        path: 'weight',
        message:
          '"exclusiveMinimum" is not enforced; add a validator through `overrides`',
      },
    ]);
  });

  it('finds the same operation by operationId through the path item $ref', () => {
    const { fields } = fieldsFromOpenApi(petstore31, {
      operationId: 'createPet',
    });

    expect(names(fields)).not.toContain('id');
    expect(names(fields)[0]).toBe('name');
  });
});

describe('fieldsFromOpenApi errors', () => {
  it('names an unknown operationId and lists the known ones', () => {
    expect(() =>
      fieldsFromOpenApi(petstore30, { operationId: 'adoptPet' }),
    ).toThrow(/no operation has the operationId "adoptPet".*"createPet"/);
  });

  it('names an unknown path, method or schema', () => {
    expect(() =>
      fieldsFromOpenApi(petstore30, { path: '/cats', method: 'post' }),
    ).toThrow('the document has no path "/cats"');
    expect(() =>
      fieldsFromOpenApi(petstore30, { path: '/pets', method: 'get' }),
    ).toThrow('the document has no operation GET /pets');
    expect(() =>
      fieldsFromOpenApi(petstore30, { path: '/pets', method: 'fetch' }),
    ).toThrow('"fetch" is not an HTTP method');
    expect(() => fieldsFromOpenApi(petstore30, { schema: 'Cat' })).toThrow(
      /components\.schemas has no "Cat"; it has "NewPet", "Pet"/,
    );
  });

  it('says when an operation has no request body', () => {
    expect(() =>
      fieldsFromOpenApi(petstore30, { operationId: 'deletePet' }),
    ).toThrow('operation "deletePet" has no request body');
  });

  it('says when the request body is not JSON', () => {
    expect(() =>
      fieldsFromOpenApi(petstore30, { operationId: 'uploadPhoto' }),
    ).toThrow(
      'the request body of operation "uploadPhoto" is not JSON (it accepts multipart/form-data)',
    );
    expect(() =>
      fieldsFromOpenApi(
        petstore30,
        { operationId: 'createPet' },
        { mediaType: 'application/xml' },
      ),
    ).toThrow('has no "application/xml" content (it accepts application/json)');
  });

  it('says when the body is not an object', () => {
    expect(() =>
      fieldsFromOpenApi(petstore30, { operationId: 'createPets' }),
    ).toThrow(/is not an object with "properties"/);
  });

  it('refuses a request body schema that lives in another file', () => {
    expect(() =>
      fieldsFromOpenApi(petstore30, { operationId: 'createOwner' }),
    ).toThrow(
      /\$ref "owner\.yaml#\/Owner", which points outside the document\. External references are not supported/,
    );
  });

  it('refuses a $ref that does not resolve, or goes round in a circle', () => {
    const broken = {
      openapi: '3.0.0',
      paths: {},
      components: {
        schemas: {
          Lost: { $ref: '#/components/schemas/Gone' },
          Loop: { $ref: '#/components/schemas/Loop' },
        },
      },
    };
    expect(() => fieldsFromOpenApi(broken, { schema: 'Lost' })).toThrow(
      'which does not resolve',
    );
    expect(() => fieldsFromOpenApi(broken, { schema: 'Loop' })).toThrow(
      'circular $ref',
    );
  });

  it('rejects Swagger 2.0 and anything that is not a document', () => {
    expect(() =>
      fieldsFromOpenApi({ swagger: '2.0', paths: {} }, { schema: 'Pet' }),
    ).toThrow(/Swagger 2\.0 document\. Convert it to OpenAPI 3 first/);
    expect(() => fieldsFromOpenApi({ paths: {} }, { schema: 'Pet' })).toThrow(
      'expects an OpenAPI 3.0 or 3.1 document',
    );
    expect(() =>
      fieldsFromOpenApi(null as unknown as OpenApiDocument, { schema: 'Pet' }),
    ).toThrow(TypeError);
  });
});
