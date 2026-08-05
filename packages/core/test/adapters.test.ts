import { describe, expect, it } from 'vitest';
import {
  zodValidator,
  yupValidator,
  standardSchemaValidator,
} from '../src/adapters';

describe('Schema Adapters', () => {
  it('handles zod schema validation', async () => {
    const fakeZodSchema = {
      safeParse: (data: any) => {
        if (!data.email || !data.email.includes('@')) {
          return {
            success: false,
            error: {
              issues: [{ path: ['email'], message: 'Invalid email address' }],
            },
          };
        }
        return { success: true, data };
      },
    };

    const validator = zodValidator(fakeZodSchema, 'email');
    const err = validator('invalid', { email: 'invalid' });
    expect(err).toEqual(['Invalid email address']);

    const valid = validator('test@example.com', { email: 'test@example.com' });
    expect(valid).toBeUndefined();
  });

  it('handles yup schema validation', () => {
    const fakeYupSchema = {
      validateSync: (data: any) => {
        if (!data.age || data.age < 18) {
          const err: any = new Error('Validation failed');
          err.inner = [{ path: 'age', message: 'Must be at least 18' }];
          throw err;
        }
      },
    };

    const validator = yupValidator(fakeYupSchema, 'age');
    const err = validator(15, { age: 15 });
    expect(err).toEqual(['Must be at least 18']);

    const valid = validator(20, { age: 20 });
    expect(valid).toBeUndefined();
  });

  it('handles standard schema validation', () => {
    const fakeStandardSchema = {
      '~standard': {
        validate: (data: any) => {
          if (!data.name) {
            return {
              issues: [{ path: ['name'], message: 'Name is required' }],
            };
          }
          return { issues: [] };
        },
      },
    };

    const validator = standardSchemaValidator(fakeStandardSchema, 'name');
    const err = validator('', { name: '' });
    expect(err).toEqual(['Name is required']);

    const valid = validator('John', { name: 'John' });
    expect(valid).toBeUndefined();
  });
});
