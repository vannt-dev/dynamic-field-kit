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
    const form = useDynamicForm({ fields });

    expect(form.isSubmitting.value).toBe(false);
    expect(form.isSubmitted.value).toBe(false);
  });

  it('flags isSubmitting while the submit handler is in flight', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const form = useDynamicForm({
      fields,
      initialValues: { name: 'Alice' },
    });

    const submission = form.handleSubmit(() => pending)();
    expect(form.isSubmitting.value).toBe(true);

    release();
    await submission;

    expect(form.isSubmitting.value).toBe(false);
    expect(form.isSubmitted.value).toBe(true);
  });

  it('clears isSubmitting when the submit handler throws', async () => {
    const form = useDynamicForm({ fields, initialValues: { name: 'Alice' } });

    await expect(
      form.handleSubmit(() => {
        throw new Error('boom');
      })()
    ).rejects.toThrow('boom');

    expect(form.isSubmitting.value).toBe(false);
  });

  it('routes validation failures to onInvalid', async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const form = useDynamicForm({ fields });

    await form.handleSubmit(onValid, onInvalid)();

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({ name: ['Name is required'] });
    expect(form.isSubmitted.value).toBe(true);
  });

  it('calls preventDefault on the submitted event', async () => {
    const preventDefault = vi.fn();
    const form = useDynamicForm({ fields, initialValues: { name: 'Alice' } });

    await form.handleSubmit(vi.fn())({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('resets submission state', async () => {
    const form = useDynamicForm({ fields, initialValues: { name: 'Alice' } });

    await form.handleSubmit(vi.fn())();
    expect(form.isSubmitted.value).toBe(true);

    form.reset();

    expect(form.isSubmitted.value).toBe(false);
    expect(form.isSubmitting.value).toBe(false);
  });
});

describe('useDynamicForm behaviour', () => {
  it('tracks dirty state and touched fields', () => {
    const form = useDynamicForm({ fields });

    expect(form.isDirty.value).toBe(false);

    form.setFieldValue('nickname', 'Al');
    expect(form.isDirty.value).toBe(true);
    expect(form.data.value.nickname).toBe('Al');

    form.setFieldTouched('nickname');
    expect(form.touched.value.nickname).toBe(true);

    form.setFieldTouched('nickname', false);
    expect(form.touched.value.nickname).toBe(false);
  });

  it('validates on blur by default', () => {
    const form = useDynamicForm({ fields });

    form.handleBlur('name');

    expect(form.errors.value.name).toEqual(['Name is required']);
    expect(form.touched.value.name).toBe(true);
    expect(form.isValid.value).toBe(false);
  });

  it('skips blur validation when validateOnBlur is false', () => {
    const form = useDynamicForm({ fields, validateOnBlur: false });

    form.handleBlur('name');

    expect(form.errors.value).toEqual({});
    expect(form.touched.value.name).toBe(true);
  });

  it('validates on change when validateOnChange is true', () => {
    const form = useDynamicForm({
      fields,
      initialValues: { name: 'Alice' },
      validateOnChange: true,
    });

    form.setFieldValue('name', '');

    expect(form.errors.value.name).toEqual(['Name is required']);
  });

  it('exposes an imperative validate()', () => {
    const form = useDynamicForm({ fields });

    expect(form.validate()).toBe(false);
    expect(form.errors.value.name).toEqual(['Name is required']);
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

    const form = useDynamicForm({
      fields: computed,
      initialValues: { first: 'ada' },
    });

    expect(form.data.value.upper).toBe('ADA');
  });

  it('resets to explicitly supplied values', () => {
    const form = useDynamicForm({ fields, initialValues: { name: 'Alice' } });

    form.reset({ name: 'Grace' });

    expect(form.data.value.name).toBe('Grace');
    expect(form.isDirty.value).toBe(false);
    expect(form.errors.value).toEqual({});
  });

  it('handles a whole-form change', () => {
    const form = useDynamicForm({ fields });

    form.handleChange({ name: 'Bulk', nickname: 'B' });

    expect(form.data.value).toEqual({ name: 'Bulk', nickname: 'B' });
    expect(form.isDirty.value).toBe(true);
  });
});
