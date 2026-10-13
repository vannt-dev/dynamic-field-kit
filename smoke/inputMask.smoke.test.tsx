import { createInputMask, validators } from '@dynamic-field-kit/core';
import type { FieldDescription } from '@dynamic-field-kit/core';
import { MultiFieldInput, useDynamicForm } from '@dynamic-field-kit/react';
import {
  MultiFieldInput as VueMultiFieldInput,
  useDynamicForm as useVueForm,
} from '@dynamic-field-kit/vue';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mount } from '@vue/test-utils';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

// A phone number is stored as its ten digits and shown in the usual layout.
const fields: FieldDescription[] = [
  {
    name: 'phone',
    type: 'text',
    label: 'phone',
    mask: '(999) 999-9999',
    validate: validators.minLength(10, 'Not a whole number'),
  },
];

describe('input masks, from the built packages', () => {
  it('core lays a value out and reads it back', () => {
    const mask = createInputMask('(999) 999-9999');
    expect(mask.format('5551234567')).toBe('(555) 123-4567');
    expect(mask.parse('(555) 123-4567')).toBe('5551234567');
  });

  it('react shows the layout, stores the digits and validates the digits', () => {
    let form!: ReturnType<typeof useDynamicForm>;
    const Form = () => {
      form = useDynamicForm({ fields, initialValues: { phone: '' } });
      return <MultiFieldInput fieldDescriptions={fields} form={form} />;
    };
    render(<Form />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '555123' } });
    expect(input.value).toBe('(555) 123');
    expect(form.data).toEqual({ phone: '555123' });
    let valid = true;
    act(() => {
      valid = form.validate();
    });
    expect(valid).toBe(false);
    expect(form.errors).toEqual({ phone: ['Not a whole number'] });

    fireEvent.change(input, { target: { value: '(555) 1234567' } });
    expect(input.value).toBe('(555) 123-4567');
    expect(form.data).toEqual({ phone: '5551234567' });
    act(() => {
      valid = form.validate();
    });
    expect(valid).toBe(true);

    // A digit past the last place is neither stored nor left on screen.
    fireEvent.change(input, { target: { value: '(555) 123-45678' } });
    expect(input.value).toBe('(555) 123-4567');
    expect(form.data).toEqual({ phone: '5551234567' });
  });

  it('vue keeps the same behaviour', async () => {
    const form = useVueForm({ fields, initialValues: { phone: '' } });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(VueMultiFieldInput, { fieldDescriptions: fields, form }),
      }),
    );
    const input = () => wrapper.find('input').element as HTMLInputElement;

    await wrapper.find('input').setValue('5551234567');
    expect(input().value).toBe('(555) 123-4567');
    expect(form.data.value).toEqual({ phone: '5551234567' });

    await wrapper.find('input').setValue('(555) 123-45678');
    expect(input().value).toBe('(555) 123-4567');
    expect(form.data.value).toEqual({ phone: '5551234567' });
  });
});
