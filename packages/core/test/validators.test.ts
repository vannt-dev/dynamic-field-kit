import { describe, expect, test } from 'vitest';
import { validators } from '../src/validators';

describe('validators utility', () => {
  test('validators.required', () => {
    const req = validators.required('Custom required');
    expect(req(undefined)).toBe('Custom required');
    expect(req(null)).toBe('Custom required');
    expect(req('')).toBe('Custom required');
    expect(req([])).toBe('Custom required');
    expect(req('valid')).toBeUndefined();
    expect(req([1])).toBeUndefined();
  });

  test('validators.email', () => {
    const email = validators.email();
    expect(email('test@example.com')).toBeUndefined();
    expect(email('invalid-email')).toBe('Invalid email address');
    expect(email('')).toBeUndefined(); // Empty allowed unless required is also applied
  });

  test('validators.minLength & maxLength', () => {
    const min3 = validators.minLength(3);
    const max5 = validators.maxLength(5);

    expect(min3('ab')).toBe('Minimum length is 3');
    expect(min3('abc')).toBeUndefined();
    expect(max5('abcdef')).toBe('Maximum length is 5');
    expect(max5('abcde')).toBeUndefined();
  });

  test('validators.min & max', () => {
    const min10 = validators.min(10);
    const max100 = validators.max(100);

    expect(min10(5)).toBe('Minimum value is 10');
    expect(min10(10)).toBeUndefined();
    expect(max100(150)).toBe('Maximum value is 100');
    expect(max100(100)).toBeUndefined();
  });

  test('validators.pattern', () => {
    const digitsOnly = validators.pattern(/^\d+$/, 'Numbers only');
    expect(digitsOnly('123')).toBeUndefined();
    expect(digitsOnly('abc')).toBe('Numbers only');
  });

  test('validators.compose', () => {
    const composed = validators.compose(
      validators.required('Req'),
      validators.minLength(5, 'Too short')
    );

    expect(composed('', {})).toEqual(['Req']);
    expect(composed('abc', {})).toEqual(['Too short']);
    expect(composed('abcde', {})).toBeUndefined();
  });
});
