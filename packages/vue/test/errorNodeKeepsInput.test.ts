import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry, validators } from '@dynamic-field-kit/core';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import DynamicInput from '../src/components/DynamicInput';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
import '../src/layout/defaultLayouts';
import { useDynamicForm } from '../src/useDynamicForm';

const fields: FieldDescription[] = [
  { name: 'name', type: 'text', validate: validators.required() },
];

const scoped = () => ({
  global: { provide: { [FieldRegistryKey]: new FieldRegistry() } },
});

describe('the built-in input and its error', () => {
  it('stays the same element when typing makes the error go away', async () => {
    // Replaced, the input would lose the focus after the first character.
    const form = useDynamicForm({
      fields,
      initialValues: {},
      validateOnChange: true,
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(MultiFieldInput, { fieldDescriptions: fields, form }),
      }),
      scoped(),
    );
    await form.handleSubmit(() => undefined)();
    await flushPromises();
    expect(wrapper.find('.dfk-field-error').text()).toBe('Field is required');
    const before = wrapper.find('input').element;

    await wrapper.find('input').setValue('A');
    expect(wrapper.find('.dfk-field-error').exists()).toBe(false);
    expect(wrapper.find('input').element).toBe(before);

    // And when the error comes back.
    await wrapper.find('input').setValue('');
    expect(wrapper.find('.dfk-field-error').exists()).toBe(true);
    expect(wrapper.find('input').element).toBe(before);
  });

  it('hands an attribute given to DynamicInput on to the control, error or not', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wrapper = mount(DynamicInput, {
      props: { type: 'text', id: 'f-name', value: '' },
      attrs: { 'data-step': 'one', class: 'wide' },
      ...scoped(),
    });
    const input = () => wrapper.find('input');
    expect(input().attributes('data-step')).toBe('one');
    expect(input().classes()).toContain('wide');

    await wrapper.setProps({ error: ['Field is required'] });
    expect(wrapper.find('.dfk-field-error').exists()).toBe(true);
    expect(input().attributes('data-step')).toBe('one');
    expect(input().classes()).toContain('wide');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps the class a field asks for next to one given from outside', () => {
    const wrapper = mount(DynamicInput, {
      props: { type: 'text', id: 'f-name', value: '', className: 'field' },
      attrs: { class: 'wide' },
      ...scoped(),
    });
    expect(wrapper.find('input').classes()).toEqual(
      expect.arrayContaining(['field', 'wide']),
    );
  });
});
