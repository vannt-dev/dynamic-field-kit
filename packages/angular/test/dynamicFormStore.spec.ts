import { FieldDescription } from '@dynamic-field-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { createDynamicFormStore } from '../src/lib/dynamic-form.store';

const fields: FieldDescription[] = [
  {
    name: 'username',
    type: 'text',
    required: true,
    validate: (v) => (v ? undefined : 'Username is required'),
  },
];

describe('Angular Signal DynamicFormStore', () => {
  it('initializes signal data and handles changes', () => {
    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
    });

    expect(store.data().username).toBe('john_doe');
    expect(store.isDirty()).toBe(false);

    store.setFieldValue('username', 'jane_doe');
    expect(store.data().username).toBe('jane_doe');
    expect(store.isDirty()).toBe(true);

    store.reset();
    expect(store.data().username).toBe('john_doe');
    expect(store.isDirty()).toBe(false);
  });

  it('returns a submit handler, matching the React and Vue hooks', async () => {
    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
    });
    const onValid = vi.fn();

    const submit = store.handleSubmit(onValid);
    expect(typeof submit).toBe('function');

    await submit();

    expect(onValid).toHaveBeenCalledWith({ username: 'john_doe' });
    expect(store.isSubmitted()).toBe(true);
    expect(store.isSubmitting()).toBe(false);
  });

  it('calls preventDefault on the submitted event', async () => {
    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
    });
    const preventDefault = vi.fn();

    await store.handleSubmit(vi.fn())({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('routes validation failures to onInvalid', async () => {
    const store = createDynamicFormStore({ fields });
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    await store.handleSubmit(onValid, onInvalid)();

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({
      username: ['Username is required'],
    });
    expect(store.isValid()).toBe(false);
  });

  it('clears isSubmitting when the submit handler throws', async () => {
    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
    });

    await expect(
      store.handleSubmit(() => {
        throw new Error('boom');
      })(),
    ).rejects.toThrow('boom');

    expect(store.isSubmitting()).toBe(false);
  });

  it('validates on blur and marks the field touched', () => {
    const store = createDynamicFormStore({ fields });

    store.handleBlur('username');

    expect(store.touched().username).toBe(true);
    expect(store.errors().username).toEqual(['Username is required']);
  });

  it('skips blur validation when validateOnBlur is false', () => {
    const store = createDynamicFormStore({ fields, validateOnBlur: false });

    store.handleBlur('username');

    expect(store.touched().username).toBe(true);
    expect(store.errors()).toEqual({});
  });

  it('validates on change when validateOnChange is true', () => {
    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
      validateOnChange: true,
    });

    store.setFieldValue('username', '');

    expect(store.errors().username).toEqual(['Username is required']);
  });

  it('supports setFieldTouched and imperative validate', () => {
    const store = createDynamicFormStore({ fields });

    store.setFieldTouched('username');
    expect(store.touched().username).toBe(true);
    store.setFieldTouched('username', false);
    expect(store.touched().username).toBe(false);

    expect(store.validate()).toBe(false);
    expect(store.errors().username).toEqual(['Username is required']);
  });

  it('resets to explicitly supplied values', () => {
    const store = createDynamicFormStore({
      fields,
      initialValues: { username: 'john_doe' },
    });

    store.reset({ username: 'ada' });

    expect(store.data().username).toBe('ada');
    expect(store.isSubmitted()).toBe(false);
  });
});
