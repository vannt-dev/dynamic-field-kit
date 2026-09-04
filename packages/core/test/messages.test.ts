import { afterEach, describe, expect, it } from 'vitest';
import {
  createMessageResolver,
  getDefaultMessages,
  resolveMessage,
  setDefaultMessages,
} from '../src/messages';

afterEach(() => setDefaultMessages(undefined));

describe('createMessageResolver', () => {
  it('returns the catalog entry for a known key', () => {
    const t = createMessageResolver({ required: 'Bắt buộc' });
    expect(t('required')).toBe('Bắt buộc');
  });

  it('returns undefined for a key the catalog omits', () => {
    const t = createMessageResolver({ required: 'Bắt buộc' });
    expect(t('email')).toBeUndefined();
  });

  it('interpolates named params', () => {
    const t = createMessageResolver({ minLength: 'Tối thiểu {min} ký tự' });
    expect(t('minLength', { min: 8 })).toBe('Tối thiểu 8 ký tự');
  });

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    const t = createMessageResolver({ minLength: 'At least {min} of {unit}' });
    expect(t('minLength', { min: 8 })).toBe('At least 8 of {unit}');
  });

  it('with no catalog resolves nothing', () => {
    const t = createMessageResolver();
    expect(t('required')).toBeUndefined();
  });
});

describe('setDefaultMessages', () => {
  it('is read back by getDefaultMessages', () => {
    setDefaultMessages({ required: 'Global' });
    expect(getDefaultMessages()).toEqual({ required: 'Global' });
  });

  it('is cleared by passing undefined', () => {
    setDefaultMessages({ required: 'Global' });
    setDefaultMessages(undefined);
    expect(getDefaultMessages()).toBeUndefined();
  });
});

describe('resolveMessage precedence', () => {
  it('prefers an explicitly passed message over everything', () => {
    setDefaultMessages({ required: 'Global' });
    const ctx = { t: createMessageResolver({ required: 'Scoped' }) };
    expect(
      resolveMessage(ctx, 'required', undefined, 'English', 'Explicit'),
    ).toBe('Explicit');
  });

  it('prefers the context resolver over the global default', () => {
    setDefaultMessages({ required: 'Global' });
    const ctx = { t: createMessageResolver({ required: 'Scoped' }) };
    expect(resolveMessage(ctx, 'required', undefined, 'English')).toBe(
      'Scoped',
    );
  });

  it('falls back to the global default when the context has no resolver', () => {
    setDefaultMessages({ required: 'Global' });
    expect(resolveMessage(undefined, 'required', undefined, 'English')).toBe(
      'Global',
    );
  });

  it('falls back to the hard-coded English when nothing is configured', () => {
    expect(resolveMessage(undefined, 'required', undefined, 'English')).toBe(
      'English',
    );
  });
});
