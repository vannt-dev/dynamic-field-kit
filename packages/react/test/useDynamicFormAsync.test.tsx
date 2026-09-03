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
});
