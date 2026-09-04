import { FieldDescription, validators  } from '@dynamic-field-kit/core';
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
  it('reports live validity before errors have been populated', () => {
    const store = createDynamicFormStore({ fields });

    expect(store.isValid()).toBe(false);
    expect(store.errors()).toEqual({});

    store.setFieldValue('username', 'ada');
    expect(store.isValid()).toBe(true);
  });

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

  it('touchAll expands every existing repeatable group item', () => {
    const store = createDynamicFormStore({
      fields: [
        {
          name: 'contacts',
          type: 'text',
          fields: [{ name: 'email', type: 'text' }],
        },
      ],
      initialValues: { contacts: [{ email: '' }, { email: '' }] },
    });

    store.touchAll();
    expect(store.touched()).toEqual({
      'contacts[0].email': true,
      'contacts[1].email': true,
    });
  });

  it('awaits async validation explicitly and during submit', async () => {
    const asyncFields: FieldDescription[] = [
      {
        name: 'username',
        type: 'text',
        validate: async (value) =>
          value === 'taken' ? 'Already taken' : undefined,
      },
    ];
    const store = createDynamicFormStore({
      fields: asyncFields,
      initialValues: { username: 'taken' },
    });
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    await expect(store.validateAsync()).resolves.toBe(false);
    expect(store.errors()).toEqual({ username: ['Already taken'] });

    await store.handleSubmit(onValid, onInvalid)();
    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({
      username: ['Already taken'],
    });
  });

  it('ignores a stale async validation result', async () => {
    const releases = new Map<string, (message?: string) => void>();
    const store = createDynamicFormStore({
      fields: [
        {
          name: 'username',
          type: 'text',
          validationMode: 'async',
          validate: (value) =>
            new Promise<string | undefined>((resolve) => {
              releases.set(String(value), resolve);
            }),
        },
      ],
      initialValues: { username: 'old' },
    });

    const oldRun = store.validateAsync();
    store.setFieldValue('username', 'new');
    const newRun = store.validateAsync();
    releases.get('new')?.();
    await newRun;
    releases.get('old')?.('Stale error');
    await oldRun;

    expect(store.errors()).toEqual({});
    expect(store.isValidating()).toBe(false);
  });

  it('completes a submit even when the user edits a field while it runs', async () => {
    let release: ((value: string | undefined) => void) | undefined;
    const onValid = vi.fn();
    const store = createDynamicFormStore({
      fields: [
        { name: 'username', type: 'text' },
        {
          name: 'code',
          type: 'text',
          // Only the submit's async pass invokes it, so `release` belongs to
          // that one run.
          validationMode: 'async',
          validate: () =>
            new Promise<string | undefined>((resolve) => {
              release = resolve;
            }),
        },
      ],
      initialValues: { username: 'ada', code: '1' },
    });

    const submitted = store.handleSubmit(onValid)();
    store.setFieldValue('username', 'grace');
    release?.(undefined);
    await submitted;

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith({ username: 'ada', code: '1' });
    expect(store.isSubmitted()).toBe(true);
    expect(store.isSubmitting()).toBe(false);
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

describe('baselineValues and getDirtyValues', () => {
  const baselineFields: FieldDescription[] = [
    { name: 'title', type: 'text', label: 'Title' },
    { name: 'note', type: 'text', label: 'Note' },
  ];

  it('exposes the initial values as the baseline', () => {
    const store = createDynamicFormStore({
      fields: baselineFields,
      initialValues: { title: 'a', note: 'n' },
    });
    expect(store.baselineValues()).toEqual({ title: 'a', note: 'n' });
    expect(store.getDirtyValues()).toEqual({});
  });

  it('reports only the changed entries as dirty', () => {
    const store = createDynamicFormStore({
      fields: baselineFields,
      initialValues: { title: 'a', note: 'n' },
    });
    store.setFieldValue('title', 'b');
    expect(store.getDirtyValues()).toEqual({ title: 'b' });
  });

  it('re-bases the baseline on reset(newValues)', () => {
    const store = createDynamicFormStore({
      fields: baselineFields,
      initialValues: { title: 'a', note: 'n' },
    });
    store.setFieldValue('title', 'b');
    store.reset({ title: 'c', note: 'n' });

    expect(store.baselineValues()).toEqual({ title: 'c', note: 'n' });
    expect(store.getDirtyValues()).toEqual({});
  });

  it('restores the original baseline on a bare reset()', () => {
    const store = createDynamicFormStore({
      fields: baselineFields,
      initialValues: { title: 'a', note: 'n' },
    });
    store.reset({ title: 'c', note: 'n' });
    store.reset();
    expect(store.baselineValues()).toEqual({ title: 'a', note: 'n' });
  });
});

describe('messages', () => {
  const msgFields: FieldDescription[] = [
    { name: 'title', type: 'text', validate: validators.required() },
  ];

  it('resolves validator messages through the supplied catalog', () => {
    const store = createDynamicFormStore({
      fields: msgFields,
      initialValues: { title: '' },
      messages: { required: 'Bắt buộc' },
    });
    store.validate();
    expect(store.errors()['title']).toEqual(['Bắt buộc']);
  });

  it('keeps the English default with no catalog', () => {
    const store = createDynamicFormStore({
      fields: msgFields,
      initialValues: { title: '' },
    });
    store.validate();
    expect(store.errors()['title']).toEqual(['Field is required']);
  });
});
