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
  it('does not invoke a declared async validator during a sync pass', () => {
    let calls = 0;
    const field: FieldDescription = {
      name: 'remote',
      type: 'text',
      validate: async () => {
        calls += 1;
        return undefined;
      },
    };

    expect(validateFields([field], { remote: 'x' }).status).toBe('pending');
    expect(calls).toBe(0);
  });

  it('uses validationMode for non-async Promise factories', () => {
    const validate = vi.fn(() => Promise.resolve(undefined));
    const field: FieldDescription = {
      name: 'remoteFactory',
      type: 'text',
      validationMode: 'async',
      validate,
    };

    expect(validateFields([field], {}).complete).toBe(false);
    expect(validate).not.toHaveBeenCalled();
  });

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

  it('stays quiet when the field declares validationMode: async', () => {
    // The warning exists to surface an accident. Declaring the mode is the
    // developer saying they already know, so it has nothing left to report.
    const declared: FieldDescription = {
      name: 'declaredAsyncStaysQuiet',
      type: 'text',
      validationMode: 'async',
      validate: () => Promise.resolve(undefined),
    };
    const warn = vi.mocked(console.warn);

    validateFields([declared], {});

    expect(warn).not.toHaveBeenCalled();
  });

  it('describes a detected async validator without claiming it ran', () => {
    const detected: FieldDescription = {
      name: 'detectedNotInvoked',
      type: 'text',
      validate: async () => undefined,
    };
    const warn = vi.mocked(console.warn);

    validateFields([detected], {});

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).not.toContain('returned a Promise');
    expect(warn.mock.calls[0][0]).toContain('is asynchronous');
  });
});

describe('validateFieldsAsync resolves what the sync pass could not', () => {
  it('finds the error and reports nothing pending', async () => {
    const res = await validateFieldsAsync([asyncField], { username: 'taken' });

    expect(res.valid).toBe(false);
    expect(res.errors).toEqual({ username: ['Already taken'] });
    expect(res.pending).toBeUndefined();
  });

  it('starts independent validators in parallel and preserves field order', async () => {
    const releases: Array<(value: string | undefined) => void> = [];
    const starts: string[] = [];
    const fields: FieldDescription[] = ['first', 'second'].map((name) => ({
      name,
      type: 'text',
      validate: () =>
        new Promise<string | undefined>((resolve) => {
          starts.push(name);
          releases.push(resolve);
        }),
    }));

    const pending = validateFieldsAsync(fields, {});
    await Promise.resolve();
    expect(starts).toEqual(['first', 'second']);
    releases[1]('Second error');
    releases[0]('First error');

    await expect(pending).resolves.toMatchObject({
      errors: { first: ['First error'], second: ['Second error'] },
      complete: true,
      status: 'invalid',
    });
  });

  it('passes an AbortSignal to validators', async () => {
    const controller = new AbortController();
    let received: AbortSignal | undefined;
    const field: FieldDescription = {
      name: 'remoteSignal',
      type: 'text',
      validate: async (_value, _data, _root, context) => {
        received = context?.signal;
        return undefined;
      },
    };

    await validateFieldsAsync([field], {}, {}, { signal: controller.signal });
    expect(received).toBe(controller.signal);
  });

  it('does not run validators for a signal that is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const validate = vi.fn(async () => 'Already taken');

    const res = await validateFieldsAsync(
      [{ name: 'abortedBefore', type: 'text', validate }],
      {},
      {},
      { signal: controller.signal },
    );

    expect(validate).not.toHaveBeenCalled();
    expect(res.errors).toEqual({});
    expect(res.complete).toBe(false);
    expect(res.status).toBe('pending');
  });

  it('treats a validator that honours the signal as pending, not as a failure', async () => {
    // The conventional way to honour an AbortSignal is to reject with an
    // AbortError. That must not surface as a rejected handleSubmit.
    const controller = new AbortController();
    const field: FieldDescription = {
      name: 'abortsMidFlight',
      type: 'text',
      validate: (_value, _data, _root, context) =>
        new Promise<string | undefined>((_resolve, reject) => {
          context?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    };

    const pending = validateFieldsAsync(
      [field],
      {},
      {},
      {
        signal: controller.signal,
      },
    );
    controller.abort();

    await expect(pending).resolves.toMatchObject({
      errors: {},
      complete: false,
      status: 'pending',
    });
  });

  it('still propagates an error that is not an abort', async () => {
    const field: FieldDescription = {
      name: 'throwsForReal',
      type: 'text',
      validate: async () => {
        throw new Error('validator blew up');
      },
    };

    await expect(validateFieldsAsync([field], {})).rejects.toThrow(
      'validator blew up',
    );
  });
});
