import { describe, expect, it, test } from 'vitest';
import { createMessageResolver } from '../src/messages';
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
      validators.minLength(5, 'Too short'),
    );

    expect(composed('', {})).toEqual(['Req']);
    expect(composed('abc', {})).toEqual(['Too short']);
    expect(composed('abcde', {})).toBeUndefined();
  });
});

describe('validators read the message catalog', () => {
  const ctx = {
    t: createMessageResolver({
      required: 'Bắt buộc',
      minLength: 'Tối thiểu {min} ký tự',
      max: 'Tối đa {max}',
    }),
  };

  it('uses the catalog when no message is passed', () => {
    expect(validators.required()('', {}, undefined, ctx)).toBe('Bắt buộc');
  });

  it('interpolates validator params into the catalog entry', () => {
    expect(validators.minLength(8)('abc', {}, undefined, ctx)).toBe(
      'Tối thiểu 8 ký tự',
    );
    expect(validators.max(10)(11, {}, undefined, ctx)).toBe('Tối đa 10');
  });

  it('still lets an explicitly passed message win', () => {
    expect(validators.required('Explicit')('', {}, undefined, ctx)).toBe(
      'Explicit',
    );
  });

  it('keeps the English default when no catalog is in play', () => {
    expect(validators.required()('')).toBe('Field is required');
    expect(validators.minLength(8)('abc')).toBe('Minimum length is 8');
  });

  it('threads the context through compose', () => {
    const composed = validators.compose(validators.required());
    expect(composed('', {}, undefined, ctx)).toEqual(['Bắt buộc']);
  });
});

describe('validators.matches', () => {
  it('passes when the two values are equal', () => {
    expect(
      validators.matches('password')('secret', { password: 'secret' }),
    ).toBeUndefined();
  });

  it('fails when they differ', () => {
    expect(validators.matches('password')('typo', { password: 'secret' })).toBe(
      'Must match password',
    );
  });

  it('takes its message from the catalog, with the other field interpolated', () => {
    const ctx = { t: createMessageResolver({ matches: 'Phải khớp {other}' }) };
    expect(
      validators.matches('password')(
        'typo',
        { password: 'secret' },
        undefined,
        ctx,
      ),
    ).toBe('Phải khớp password');
  });

  it('lets an explicit message win', () => {
    expect(
      validators.matches('password', 'Passwords differ')('typo', {
        password: 'secret',
      }),
    ).toBe('Passwords differ');
  });

  it('skips an empty value, leaving required to report it', () => {
    expect(
      validators.matches('password')('', { password: 'secret' }),
    ).toBeUndefined();
  });

  it('compares with Object.is so two NaNs match', () => {
    expect(validators.matches('a')(NaN, { a: NaN })).toBeUndefined();
  });
});
