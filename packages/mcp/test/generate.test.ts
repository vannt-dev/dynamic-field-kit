import { describe, expect, it } from 'vitest';
import {
  configFromJsonSchema,
  configFromOpenApi,
  InputError,
  toJsonConfig,
} from '../src/generate';
import { validateConfig } from '../src/validateConfig';
import { petstore } from './fixtures';

describe('configFromOpenApi', () => {
  it('reads an operation by operationId, path and method, or schema name', () => {
    const byId = configFromOpenApi({
      document: petstore,
      operationId: 'createPet',
    });
    expect(byId.fields.map((field) => [field.name, field.type])).toEqual([
      ['name', 'text'],
      ['status', 'select'],
      ['ownerEmail', 'email'],
    ]);
    expect(byId.defaults).toEqual({ status: 'available' });

    const byPath = configFromOpenApi({
      document: JSON.stringify(petstore),
      path: '/pets',
      method: 'post',
    });
    expect(byPath.fields.map((field) => field.name)).toEqual(
      byId.fields.map((field) => field.name),
    );

    const bySchema = configFromOpenApi({
      document: petstore,
      schema: 'NewPet',
      keepReadOnly: true,
    });
    expect(bySchema.fields.map((field) => field.name)).toContain('id');
  });

  it('turns bad input into an InputError', () => {
    expect(() => configFromOpenApi({ document: petstore })).toThrow(InputError);
    expect(() =>
      configFromOpenApi({ document: petstore, operationId: 'x', schema: 'y' }),
    ).toThrow(/exactly one/);
    expect(() =>
      configFromOpenApi({ document: petstore, path: '/pets' }),
    ).toThrow(/go together/);
    expect(() =>
      configFromOpenApi({ document: petstore, operationId: 'nope' }),
    ).toThrow(InputError);
    expect(() =>
      configFromOpenApi({ document: 'openapi: 3.1.0', operationId: 'a' }),
    ).toThrow(/not JSON/);
    expect(() =>
      configFromOpenApi({ document: { swagger: '2.0' }, operationId: 'a' }),
    ).toThrow(/Swagger 2.0/);
  });
});

describe('configFromJsonSchema', () => {
  it('builds fields from a JSON Schema', () => {
    const { fields } = configFromJsonSchema({
      type: 'object',
      properties: { age: { type: 'integer', minimum: 0 } },
    });
    expect(fields[0]).toMatchObject({ name: 'age', type: 'number', min: 0 });
    expect(() => configFromJsonSchema({ type: 'string' })).toThrow(InputError);
  });
});

describe('toJsonConfig', () => {
  it('drops the functions core generated and lists them', () => {
    const config = toJsonConfig(
      configFromOpenApi({ document: petstore, operationId: 'createPet' }),
    );

    expect(config.droppedFunctions).toEqual([
      { path: '[0]', key: 'validate' },
      { path: '[2]', key: 'validate' },
    ]);
    expect(JSON.parse(JSON.stringify(config.fields))).toEqual(config.fields);
    expect(validateConfig(config.fields)).toEqual({
      valid: true,
      problems: [],
    });
  });

  it('walks into groups and sections', () => {
    const config = toJsonConfig(
      configFromJsonSchema({
        type: 'object',
        properties: {
          address: {
            type: 'object',
            required: ['city'],
            properties: { city: { type: 'string' } },
          },
          contacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: { email: { type: 'string', format: 'email' } },
            },
          },
        },
      }),
    );
    expect(config.droppedFunctions).toEqual([
      { path: '[0].section[0]', key: 'validate' },
      { path: '[1].fields[0]', key: 'validate' },
    ]);
  });
});
