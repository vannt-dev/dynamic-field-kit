import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import { z } from 'zod';
import {
  standardSchemaValidator,
  yupValidator,
  zodValidator,
} from '../src/adapters';
import type { FieldDescription } from '../src/types';
import { validateFields, validateFieldsAsync } from '../src/validation';

describe('zodValidator with a real Zod schema', () => {
  const schema = z.object({
    email: z.string().email('Invalid email address'),
  });

  it('reports field errors through the synchronous validateFields path', () => {
    const fields: FieldDescription[] = [
      { name: 'email', type: 'text', validate: zodValidator(schema, 'email') },
    ];

    const res = validateFields(fields, { email: 'not-an-email' });

    expect(res.valid).toBe(false);
    expect(res.errors.email).toEqual(['Invalid email address']);
  });

  it('returns messages synchronously rather than a Promise', () => {
    const result = zodValidator(schema, 'email')('nope', { email: 'nope' });

    expect(result).not.toBeInstanceOf(Promise);
    expect(result).toEqual(['Invalid email address']);
  });

  it('accepts valid data', () => {
    const result = zodValidator(schema, 'email')('a@b.com', {
      email: 'a@b.com',
    });

    expect(result).toBeUndefined();
  });

  it('validates the whole form object when no fieldName is given', () => {
    const validator = zodValidator(schema);

    // `value` is the field's own value; the schema describes the whole form,
    // so the form data must be what gets parsed.
    const result = validator('not-an-email', { email: 'not-an-email' });

    expect(result).toEqual(['Invalid email address']);
  });

  it('falls back to async parsing for schemas with async refinements', async () => {
    const asyncSchema = z.object({
      name: z.string().refine(async (v) => v.length > 2, 'Name is too short'),
    });
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        validate: zodValidator(asyncSchema, 'name'),
      },
    ];

    const res = await validateFieldsAsync(fields, { name: 'x' });

    expect(res.valid).toBe(false);
    expect(res.errors.name).toEqual(['Name is too short']);
  });
});

describe('yupValidator with a real Yup schema', () => {
  const schema = yup.object({
    age: yup.number().min(18, 'Must be at least 18'),
  });

  it('reports field errors through the synchronous validateFields path', () => {
    const fields: FieldDescription[] = [
      { name: 'age', type: 'number', validate: yupValidator(schema, 'age') },
    ];

    const res = validateFields(fields, { age: 15 });

    expect(res.valid).toBe(false);
    expect(res.errors.age).toEqual(['Must be at least 18']);
  });

  it('accepts valid data', () => {
    const result = yupValidator(schema, 'age')(20, { age: 20 });

    expect(result).toBeUndefined();
  });

  it('validates the whole form object when no fieldName is given', () => {
    const result = yupValidator(schema)(15, { age: 15 });

    expect(result).toEqual(['Must be at least 18']);
  });

  it('does not surface Yup internal async errors as validation messages', async () => {
    const asyncSchema = yup.object({
      name: yup
        .string()
        .test('async-check', 'Name is taken', async (v) => v === 'free'),
    });

    const result = await yupValidator(asyncSchema, 'name')('taken', {
      name: 'taken',
    });

    expect(result).toEqual(['Name is taken']);
  });

  it('falls back to async validation through validateFieldsAsync', async () => {
    const asyncSchema = yup.object({
      name: yup
        .string()
        .test('async-check', 'Name is taken', async (v) => v === 'free'),
    });
    const fields: FieldDescription[] = [
      {
        name: 'name',
        type: 'text',
        validate: yupValidator(asyncSchema, 'name'),
      },
    ];

    const res = await validateFieldsAsync(fields, { name: 'taken' });

    expect(res.errors.name).toEqual(['Name is taken']);
  });
});

describe('field-level (scalar) schemas via target: "field"', () => {
  it('parses the field value alone with a scalar Zod schema', () => {
    const validator = zodValidator(z.string().email('Invalid email address'), {
      target: 'field',
    });

    expect(validator('nope', { email: 'nope' })).toEqual([
      'Invalid email address',
    ]);
    expect(validator('a@b.com', { email: 'a@b.com' })).toBeUndefined();
  });

  it('parses the field value alone with a scalar Yup schema', () => {
    const validator = yupValidator(yup.string().min(3, 'Too short'), {
      target: 'field',
    });

    expect(validator('hi', { name: 'hi' })).toEqual(['Too short']);
    expect(validator('hello', { name: 'hello' })).toBeUndefined();
  });

  it('parses the field value alone with a scalar Standard Schema', () => {
    const validator = standardSchemaValidator(z.string().min(2, 'Too short'), {
      target: 'field',
    });

    expect(validator('x', { city: 'x' })).toEqual(['Too short']);
    expect(validator('xy', { city: 'xy' })).toBeUndefined();
  });

  it('still accepts a plain field name string for form schemas', () => {
    const schema = z.object({ email: z.string().email('Invalid email') });

    expect(zodValidator(schema, 'email')('bad', { email: 'bad' })).toEqual([
      'Invalid email',
    ]);
    expect(
      zodValidator(schema, { field: 'email' })('bad', { email: 'bad' }),
    ).toEqual(['Invalid email']);
  });
});

describe('standardSchemaValidator with a real Zod schema', () => {
  const schema = z.object({
    city: z.string().min(2, 'City is too short'),
  });

  it('reports field errors through the synchronous validateFields path', () => {
    const fields: FieldDescription[] = [
      {
        name: 'city',
        type: 'text',
        validate: standardSchemaValidator(schema, 'city'),
      },
    ];

    const res = validateFields(fields, { city: 'x' });

    expect(res.valid).toBe(false);
    expect(res.errors.city).toEqual(['City is too short']);
  });

  it('validates the whole form object when no fieldName is given', () => {
    const result = standardSchemaValidator(schema)('x', { city: 'x' });

    expect(result).toEqual(['City is too short']);
  });
});
