import { validators, type FieldDescription } from '@dynamic-field-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { createDynamicForm } from '../src/createDynamicForm.svelte.js';
import './helpers';

const fields: FieldDescription[] = [
  { name: 'first', type: 'text', validate: validators.required() },
  { name: 'last', type: 'text' },
  {
    name: 'full',
    type: 'text',
    computeValue: (data) =>
      [data.first, data.last].filter(Boolean).join(' ') || undefined,
  },
];

describe('createDynamicForm', () => {
  it('starts from the initial values with computed values applied', () => {
    const form = createDynamicForm({
      fields,
      initialValues: { first: 'Ada', last: 'Lovelace' },
    });

    expect(form.data).toEqual({
      first: 'Ada',
      last: 'Lovelace',
      full: 'Ada Lovelace',
    });
    expect(form.isValid).toBe(true);
    expect(form.isDirty).toBe(false);
    expect(form.errors).toEqual({});
    expect(form.touched).toEqual({});
    expect(form.validationStatus).toBe('valid');
    expect(form.isValidationComplete).toBe(true);
  });

  it('knows an empty required field is invalid without showing its error yet', () => {
    const form = createDynamicForm({ fields });

    expect(form.isValid).toBe(false);
    // Errors appear on blur, change (when asked) or submit - not on load.
    expect(form.errors).toEqual({});
  });

  it('a change replaces the data, recomputes, and marks the form dirty', () => {
    const form = createDynamicForm({ fields });
    const before = form.data;

    form.handleChange({ first: 'Grace', last: 'Hopper' });

    expect(form.data).not.toBe(before);
    expect(form.data.full).toBe('Grace Hopper');
    expect(form.isDirty).toBe(true);
    expect(form.isValid).toBe(true);
    expect(form.errors).toEqual({});
  });

  it('shows errors as the user types only when asked to', () => {
    const quiet = createDynamicForm({ fields, initialValues: { first: 'A' } });
    quiet.setFieldValue('first', '');
    expect(quiet.isValid).toBe(false);
    expect(quiet.errors).toEqual({});

    const eager = createDynamicForm({
      fields,
      initialValues: { first: 'A' },
      validateOnChange: true,
    });
    eager.setFieldValue('first', '');
    expect(eager.errors.first).toEqual(['Field is required']);
  });

  it('a blur touches the field and validates, unless told not to', () => {
    const form = createDynamicForm({ fields });
    form.handleBlur('first');
    expect(form.touched).toEqual({ first: true });
    expect(form.errors.first).toEqual(['Field is required']);

    const lazy = createDynamicForm({ fields, validateOnBlur: false });
    lazy.handleBlur('first');
    expect(lazy.touched).toEqual({ first: true });
    expect(lazy.errors).toEqual({});
  });

  it('uses the messages given for the whole form', () => {
    const form = createDynamicForm({
      fields,
      messages: { required: 'Bắt buộc' },
    });
    expect(form.validate()).toBe(false);
    expect(form.errors.first).toEqual(['Bắt buộc']);
  });

  it('tracks touched by hand, all at once, and clears it', () => {
    const form = createDynamicForm({ fields });

    form.setFieldTouched('last');
    expect(form.touched).toEqual({ last: true });
    form.setFieldTouched('last', false);
    expect(form.touched).toEqual({ last: false });

    form.touchAll();
    expect(form.touched).toEqual({ first: true, last: true, full: true });

    form.resetTouched();
    expect(form.touched).toEqual({});
  });

  it('reports only the values that differ from the baseline', () => {
    const form = createDynamicForm({
      fields,
      initialValues: { first: 'Ada', last: 'Lovelace' },
    });
    expect(form.getDirtyValues()).toEqual({});

    form.setFieldValue('last', 'Byron');
    expect(form.getDirtyValues()).toEqual({ last: 'Byron', full: 'Ada Byron' });
  });

  it('reset goes back to the initial values, or to new ones as the baseline', () => {
    const form = createDynamicForm({ fields, initialValues: { first: 'Ada' } });
    form.setFieldValue('first', '');
    form.handleBlur('first');
    expect(form.isDirty).toBe(true);

    form.reset();
    expect(form.data.first).toBe('Ada');
    expect(form.isDirty).toBe(false);
    expect(form.errors).toEqual({});
    expect(form.touched).toEqual({});
    expect(form.isValid).toBe(true);

    form.reset({ first: 'Grace', last: 'Hopper' });
    expect(form.baselineValues).toEqual({
      first: 'Grace',
      last: 'Hopper',
      full: 'Grace Hopper',
    });
    expect(form.getDirtyValues()).toEqual({});
  });

  it('a valid submit hands over the data and stops the page reload', async () => {
    const form = createDynamicForm({ fields, initialValues: { first: 'Ada' } });
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const event = { preventDefault: vi.fn() } as unknown as Event;

    await form.handleSubmit(onValid, onInvalid)(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onValid).toHaveBeenCalledWith({ first: 'Ada', full: 'Ada' });
    expect(onInvalid).not.toHaveBeenCalled();
    expect(form.isSubmitted).toBe(true);
    expect(form.isSubmitting).toBe(false);
  });

  it('an invalid submit touches every field and shows the errors', async () => {
    const form = createDynamicForm({ fields });
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    await form.handleSubmit(onValid, onInvalid)();

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith({ first: ['Field is required'] });
    expect(form.touched).toEqual({ first: true, last: true, full: true });
    expect(form.errors.first).toEqual(['Field is required']);
    // Without the second callback an invalid submit is simply not sent.
    await form.handleSubmit(onValid)();
    expect(onValid).not.toHaveBeenCalled();
  });

  describe('with a validator that answers later', () => {
    function taken(delay: Array<() => void>): FieldDescription[] {
      return [
        {
          name: 'user',
          type: 'text',
          validationMode: 'async',
          validate: (value) =>
            new Promise<string | undefined>((resolve) => {
              delay.push(() =>
                resolve(value === 'ada' ? 'Already taken' : undefined),
              );
            }),
        },
      ];
    }

    it('is pending until the answer arrives', async () => {
      const answers: Array<() => void> = [];
      const form = createDynamicForm({
        fields: taken(answers),
        initialValues: { user: 'ada' },
      });

      const result = form.validateAsync();
      expect(form.isValidating).toBe(true);
      expect(form.validationStatus).toBe('pending');
      expect(form.isValidationComplete).toBe(false);

      answers.forEach((answer) => answer());
      expect(await result).toBe(false);
      expect(form.isValidating).toBe(false);
      expect(form.errors.user).toEqual(['Already taken']);
    });

    it('drops an answer about data the user has since changed', async () => {
      const answers: Array<() => void> = [];
      const form = createDynamicForm({
        fields: taken(answers),
        initialValues: { user: 'ada' },
      });

      const result = form.validateAsync();
      form.setFieldValue('user', 'grace');
      answers.forEach((answer) => answer());
      await result;

      // "Already taken" was about `ada`; it must not land on `grace`.
      expect(form.errors).toEqual({});
      expect(form.isValidating).toBe(false);
    });

    it('a submit answers for the data that was submitted', async () => {
      const answers: Array<() => void> = [];
      const form = createDynamicForm({
        fields: taken(answers),
        initialValues: { user: 'grace' },
      });
      const onValid = vi.fn();

      const submitting = form.handleSubmit(onValid)();
      expect(form.isSubmitting).toBe(true);
      // Typing during the submit does not cancel it.
      form.setFieldValue('user', 'gracie');
      await Promise.resolve();
      answers.forEach((answer) => answer());
      await submitting;

      expect(onValid).toHaveBeenCalledWith({ user: 'grace' });
      expect(form.isSubmitting).toBe(false);
      expect(form.data.user).toBe('gracie');
    });

    it('destroy cancels what is still in flight', async () => {
      let signal: AbortSignal | undefined;
      const form = createDynamicForm({
        fields: [
          {
            name: 'user',
            type: 'text',
            validationMode: 'async',
            validate: (_value, _data, _root, context) => {
              signal = context?.signal;
              return new Promise<undefined>(() => {});
            },
          },
        ],
      });

      void form.validateAsync();
      await Promise.resolve();
      expect(signal?.aborted).toBe(false);
      form.destroy();
      expect(signal?.aborted).toBe(true);
    });
  });
});
