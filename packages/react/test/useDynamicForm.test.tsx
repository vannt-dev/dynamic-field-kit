import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FieldDescription } from '../src';
import { useDynamicForm } from '../src';

const fields: FieldDescription[] = [
  {
    name: 'name',
    type: 'text',
    validate: (v) => (v ? undefined : 'Name is required'),
  },
  { name: 'nickname', type: 'text' },
];

describe('useDynamicForm submission state', () => {
  it('starts out not submitting and not submitted', () => {
    const { result } = renderHook(() => useDynamicForm({ fields }));

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isSubmitted).toBe(false);
  });

  it('flags isSubmitting while the submit handler is in flight', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues: { name: 'Alice' } })
    );

    let submission!: Promise<void>;
    act(() => {
      submission = result.current.handleSubmit(() => pending)();
    });

    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    await act(async () => {
      release();
      await submission;
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isSubmitted).toBe(true);
  });

  it('clears isSubmitting when the submit handler throws', async () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues: { name: 'Alice' } })
    );

    await act(async () => {
      await expect(
        result.current.handleSubmit(() => {
          throw new Error('boom');
        })()
      ).rejects.toThrow('boom');
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('marks isSubmitted even when validation fails', async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const { result } = renderHook(() => useDynamicForm({ fields }));

    await act(async () => {
      await result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({ name: ['Name is required'] });
    expect(result.current.isSubmitted).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('resets submission state', async () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues: { name: 'Alice' } })
    );

    await act(async () => {
      await result.current.handleSubmit(vi.fn())();
    });
    expect(result.current.isSubmitted).toBe(true);

    act(() => result.current.reset());

    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('useDynamicForm behaviour', () => {
  it('calls preventDefault on the submitted event', async () => {
    const preventDefault = vi.fn();
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues: { name: 'Alice' } })
    );

    await act(async () => {
      await result.current.handleSubmit(vi.fn())({
        preventDefault,
      } as unknown as React.FormEvent);
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('tracks dirty state and touched fields', () => {
    const { result } = renderHook(() => useDynamicForm({ fields }));

    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setFieldValue('nickname', 'Al'));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.data.nickname).toBe('Al');

    act(() => result.current.setFieldTouched('nickname'));
    expect(result.current.touched.nickname).toBe(true);

    act(() => result.current.setFieldTouched('nickname', false));
    expect(result.current.touched.nickname).toBe(false);
  });

  it('validates on blur by default', () => {
    const { result } = renderHook(() => useDynamicForm({ fields }));

    act(() => result.current.handleBlur('name'));

    expect(result.current.errors.name).toEqual(['Name is required']);
    expect(result.current.touched.name).toBe(true);
    expect(result.current.isValid).toBe(false);
  });

  it('skips blur validation when validateOnBlur is false', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, validateOnBlur: false })
    );

    act(() => result.current.handleBlur('name'));

    expect(result.current.errors).toEqual({});
    expect(result.current.touched.name).toBe(true);
  });

  it('validates on change when validateOnChange is true', () => {
    const { result } = renderHook(() =>
      useDynamicForm({
        fields,
        initialValues: { name: 'Alice' },
        validateOnChange: true,
      })
    );

    act(() => result.current.setFieldValue('name', ''));

    expect(result.current.errors.name).toEqual(['Name is required']);
  });

  it('exposes an imperative validate()', () => {
    const { result } = renderHook(() => useDynamicForm({ fields }));

    let valid!: boolean;
    act(() => {
      valid = result.current.validate();
    });

    expect(valid).toBe(false);
    expect(result.current.errors.name).toEqual(['Name is required']);
  });

  it('applies computed values to the initial data', () => {
    const computed: FieldDescription[] = [
      { name: 'first', type: 'text' },
      {
        name: 'upper',
        type: 'text',
        computeValue: (d) => String(d.first ?? '').toUpperCase(),
      },
    ];
    const { result } = renderHook(() =>
      useDynamicForm({ fields: computed, initialValues: { first: 'ada' } })
    );

    expect(result.current.data.upper).toBe('ADA');
  });

  it('resets to explicitly supplied values', () => {
    const { result } = renderHook(() =>
      useDynamicForm({ fields, initialValues: { name: 'Alice' } })
    );

    act(() => result.current.reset({ name: 'Grace' }));

    expect(result.current.data.name).toBe('Grace');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it('supports direct setData updates', () => {
    const { result } = renderHook(() => useDynamicForm({ fields }));

    act(() => result.current.setData({ name: 'Direct' }));

    expect(result.current.data.name).toBe('Direct');
  });
});
