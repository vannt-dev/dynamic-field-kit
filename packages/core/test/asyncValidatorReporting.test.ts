import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldDescription } from '../src/types';
import { validateFields, validateFieldsAsync } from '../src/validation';

const sync: FieldDescription = {
  name: 'name',
  type: 'text',
  validate: (v) => (v ? undefined : 'Required'),
};

const asyncField: FieldDescription = {
  name: 'username',
  type: 'text',
  validate: async (v) => (v === 'taken' ? 'Already taken' : undefined),
};

// The dev warning is memoised per field name for the life of the module, so
// every test below that cares about it uses a field name of its own rather
// than resetting shared state. This keeps the rest of the suite quiet.
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateFields reports fields it could not resolve', () => {
  it('leaves `pending` off entirely when every validator is sync', () => {
    const res = validateFields([sync], { name: '' });

    expect(res.valid).toBe(false);
    expect(res.pending).toBeUndefined();
  });

  it('names the field whose validator returned a Promise', () => {
    const res = validateFields([asyncField], { username: 'taken' });

    expect(res.pending).toEqual(['username']);
  });

  it('does not claim valid on the strength of an unresolved field alone', () => {
    // The sync pass genuinely found no errors, so `valid` stays true - but
    // `pending` is what tells a caller that answer is provisional.
    const res = validateFields([asyncField], { username: 'taken' });

    expect(res.valid).toBe(true);
    expect(res.pending).toHaveLength(1);
  });

  it('keys a pending group field the way it keys a group error', () => {
    const group: FieldDescription = {
      name: 'contacts',
      type: 'text',
      fields: [asyncField],
    };

    const res = validateFields([group], {
      contacts: [{ username: 'a' }, { username: 'taken' }],
    });

    expect(res.pending).toEqual([
      'contacts[0].username',
      'contacts[1].username',
    ]);
  });

  it('ignores an unresolved validator on a field that is hidden or disabled', () => {
    const hidden: FieldDescription = {
      ...asyncField,
      appearCondition: () => false,
    };
    const disabled: FieldDescription = { ...asyncField, disabled: true };

    expect(validateFields([hidden], {}).pending).toBeUndefined();
    expect(validateFields([disabled], {}).pending).toBeUndefined();
  });

  it('reports both real errors and pending fields together', () => {
    const res = validateFields([sync, asyncField], {
      name: '',
      username: 'taken',
    });

    expect(res.errors).toEqual({ name: ['Required'] });
    expect(res.pending).toEqual(['username']);
    expect(res.valid).toBe(false);
  });
});

describe('development warning for a validator the sync pass cannot check', () => {
  it('warns once per field, not once per call', () => {
    // A name used by no other test, since the memo is module-scoped.
    const once: FieldDescription = {
      name: 'warnsOnlyOnce',
      type: 'text',
      validate: async () => undefined,
    };
    const warn = vi.mocked(console.warn);

    validateFields([once], { warnsOnlyOnce: 'a' });
    validateFields([once], { warnsOnlyOnce: 'b' });
    validateFields([once], { warnsOnlyOnce: 'c' });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('warnsOnlyOnce');
    expect(warn.mock.calls[0][0]).toContain('validateFieldsAsync');
    // Says what actually happens now that handleSubmit awaits, so it does not
    // read as an alarm to someone who has wired everything correctly.
    expect(warn.mock.calls[0][0]).toContain('Submitting awaits it');
  });

  it('warns once for a field name shared across group items', () => {
    const child: FieldDescription = {
      name: 'sharedAcrossItems',
      type: 'text',
      validate: async () => undefined,
    };
    const group: FieldDescription = {
      name: 'rows',
      type: 'text',
      fields: [child],
    };
    const warn = vi.mocked(console.warn);

    validateFields([group], { rows: [{}, {}, {}] });

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('stays quiet for sync validators', () => {
    const warn = vi.mocked(console.warn);

    validateFields([sync], { name: '' });

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('validateFieldsAsync resolves what the sync pass could not', () => {
  it('finds the error and reports nothing pending', async () => {
    const res = await validateFieldsAsync([asyncField], { username: 'taken' });

    expect(res.valid).toBe(false);
    expect(res.errors).toEqual({ username: ['Already taken'] });
    expect(res.pending).toBeUndefined();
  });
});
