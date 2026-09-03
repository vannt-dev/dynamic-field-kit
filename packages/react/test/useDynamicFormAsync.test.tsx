/**
 * The two DX gaps the 1.5.1 report raised alongside the bugs:
 *  - `isValid` was derived from the lazily-populated `errors` state, so a form
 *    with an empty required field reported `isValid: true` until something
 *    happened to validate it. Anyone using it to disable a submit button got
 *    the wrong answer exactly when it mattered - at first paint.
 *  - a `validate` hook returning a Promise was treated as valid on the sync
 *    submit path, so an async rule could not block a submit at all.
 */
import type { FieldDescription } from '@dynamic-field-kit/core';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDynamicForm } from '../src/useDynamicForm';

const required: FieldDescription[] = [
  {
    name: 'username',
    type: 'text',
    required: true,
    validate: (v) => (v ? undefined : 'Required'),
  },
];

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('isValid reflects the data, not the last validation run', () => {
  it('is already false on a server render, where effects never run', () => {
    // renderHook flushes effects before the assertion, so an effect-seeded
    // result looks correct there. Server rendering is where it shows: the
    // markup ships with a submit button that never disables.
    const Probe = () => {
      const { isValid } = useDynamicForm({
        fields: required,
        initialValues: { username: '' },
      });
      return <span>{String(isValid)}</span>;
    };

    expect(renderToString(<Probe />)).toContain('>false<');
  });

  it('is false at first render for an empty required field', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields: required, initialValues: { username: '' } }),
    );

    expect(result.current.isValid).toBe(false);
  });

  it('flips to true as soon as the data is valid, with no validate() call', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields: required, initialValues: { username: '' } }),
    );

    act(() => result.current.setFieldValue('username', 'ada'));

    expect(result.current.isValid).toBe(true);
  });

  it('leaves `errors` lazy - it still only fills in on validate/blur/submit', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields: required, initialValues: { username: '' } }),
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toEqual({});

    act(() => {
      result.current.validate();
    });

    expect(result.current.errors).toEqual({ username: ['Required'] });
  });

  it('ignores a field that is hidden or disabled, as validateFields does', () => {
    const hidden: FieldDescription[] = [
      { ...required[0], appearCondition: () => false },
    ];
    const { result } = renderHook(() =>
      useDynamicForm({ fields: hidden, initialValues: { username: '' } }),
    );

    expect(result.current.isValid).toBe(true);
  });
});

describe('handleSubmit awaits async validators instead of ignoring them', () => {
  const asyncFields: FieldDescription[] = [
    {
      name: 'username',
      type: 'text',
      validate: async (v) => (v === 'taken' ? 'Already taken' : undefined),
    },
  ];

  it('blocks the submit when an async rule fails', async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() =>
      useDynamicForm({
        fields: asyncFields,
        initialValues: { username: 'taken' },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({ username: ['Already taken'] });
    expect(result.current.errors).toEqual({ username: ['Already taken'] });
  });

  it('lets the submit through when the async rule passes', async () => {
    const onValid = vi.fn();
    const { result } = renderHook(() =>
      useDynamicForm({
        fields: asyncFields,
        initialValues: { username: 'free' },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(onValid)();
    });

    expect(onValid).toHaveBeenCalledWith({ username: 'free' });
    expect(result.current.errors).toEqual({});
  });

  it('does not run a second pass when every validator is sync', async () => {
    const validate = vi.fn((v: unknown) => (v ? undefined : 'Required'));
    const syncFields: FieldDescription[] = [
      { name: 'a', type: 'text', validate },
    ];
    const { result } = renderHook(() =>
      useDynamicForm({
        fields: syncFields,
        initialValues: { a: 'x' },
      }),
    );
    validate.mockClear();

    await act(async () => {
      await result.current.handleSubmit(() => {})();
    });

    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('clears isSubmitting once the async pass settles', async () => {
    const { result } = renderHook(() =>
      useDynamicForm({
        fields: asyncFields,
        initialValues: { username: 'taken' },
      }),
    );

    await act(async () => {
      await result.current.handleSubmit(() => {})();
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(result.current.isSubmitted).toBe(true);
  });
});

describe('a submit already in flight', () => {
  it('still completes when the user edits a field while it runs', async () => {
    // The remote check is slow, the user tabs into another field meanwhile.
    // The submit must still resolve against the data that was submitted -
    // otherwise the button just re-enables and nothing tells the user why.
    let release: ((value: string | undefined) => void) | undefined;
    const slow: FieldDescription[] = [
      { name: 'username', type: 'text' },
      {
        name: 'code',
        type: 'text',
        // Declared async so only the submit's async pass invokes it - the live
        // sync pass skips it, which keeps `release` pointing at this one run.
        validationMode: 'async',
        validate: () =>
          new Promise<string | undefined>((resolve) => {
            release = resolve;
          }),
      },
    ];
    const onValid = vi.fn();
    const { result } = renderHook(() =>
      useDynamicForm({
        fields: slow,
        initialValues: { username: 'a', code: '1' },
      }),
    );

    let submitted: Promise<void> | undefined;
    act(() => {
      submitted = result.current.handleSubmit(onValid)();
    });
    act(() => {
      result.current.handleChange({ username: 'ab', code: '1' });
    });

    await act(async () => {
      release?.(undefined);
      await submitted;
    });

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith({ username: 'a', code: '1' });
    expect(result.current.isSubmitted).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('validateAsync', () => {
  it('resolves async rules that validate() cannot', async () => {
    const asyncFields: FieldDescription[] = [
      {
        name: 'username',
        type: 'text',
        validate: async () => 'Always fails',
      },
    ];
    const { result } = renderHook(() =>
      useDynamicForm({ fields: asyncFields, initialValues: { username: 'x' } }),
    );

    let sync: boolean | undefined;
    act(() => {
      sync = result.current.validate();
    });
    expect(sync).toBe(true);
    expect(result.current.errors).toEqual({});

    let asyncValid: boolean | undefined;
    await act(async () => {
      asyncValid = await result.current.validateAsync();
    });

    expect(asyncValid).toBe(false);
    expect(result.current.errors).toEqual({ username: ['Always fails'] });
  });

  it('ignores a stale result when a newer validation finishes first', async () => {
    const releases = new Map<string, (message?: string) => void>();
    const fields: FieldDescription[] = [
      {
        name: 'username',
        type: 'text',
        validationMode: 'async',
        validate: (value) =>
          new Promise<string | undefined>((resolve) => {
            releases.set(String(value), resolve);
          }),
      },
    ];
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues: { username: 'old' } }),
    );

    let oldRun!: Promise<boolean>;
    let newRun!: Promise<boolean>;
    act(() => {
      oldRun = result.current.validateAsync();
    });
    act(() => result.current.setFieldValue('username', 'new'));
    act(() => {
      newRun = result.current.validateAsync();
    });
    expect(result.current.isValidating).toBe(true);

    await act(async () => {
      releases.get('new')?.();
      await newRun;
      releases.get('old')?.('Stale error');
      await oldRun;
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.isValidating).toBe(false);
  });
});

describe('nested touched paths', () => {
  it('touchAll expands every existing repeatable group item', () => {
    const { result } = renderHook(() =>
      useDynamicForm({
        fields: [
          {
            name: 'contacts',
            type: 'text',
            fields: [{ name: 'email', type: 'text' }],
          },
        ],
        initialValues: { contacts: [{ email: '' }, { email: '' }] },
      }),
    );

    act(() => result.current.touchAll());
    expect(result.current.touched).toEqual({
      'contacts[0].email': true,
      'contacts[1].email': true,
    });
  });
});
