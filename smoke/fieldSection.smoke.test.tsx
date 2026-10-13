import {
  collectFieldPaths,
  fieldsFromJsonSchema,
  fieldsToJsonSchema,
  serverErrorsFrom,
  validateFields,
  validators,
} from '@dynamic-field-kit/core';
import type { FieldDescription } from '@dynamic-field-kit/core';
import { MultiFieldInput, useDynamicForm } from '@dynamic-field-kit/react';
import {
  MultiFieldInput as VueMultiFieldInput,
  useDynamicForm as useVueForm,
} from '@dynamic-field-kit/vue';
import { act, fireEvent, render } from '@testing-library/react';
import { flushPromises, mount } from '@vue/test-utils';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

// An order with the address it ships to: one object inside the form's data.
const fields: FieldDescription[] = [
  { name: 'name', type: 'text', label: 'Name' },
  {
    name: 'address',
    type: 'text',
    label: 'Ship to',
    section: [
      {
        name: 'street',
        type: 'text',
        label: 'Street',
        validate: validators.required(),
      },
      { name: 'city', type: 'text', label: 'City' },
    ],
  },
];

// What a backend answers when it refuses the address (ASP.NET's shape).
const refusal = { errors: { 'Address.Street': ['No such street'] } };

describe('sections, from the built packages', () => {
  it('core validates inside a section and names its fields by path', () => {
    expect(validateFields(fields, { name: 'Ada' }).errors).toEqual({
      'address.street': ['Field is required'],
    });
    const paths = collectFieldPaths(fields, {});
    expect(paths).toEqual(['name', 'address.street', 'address.city']);
    expect(serverErrorsFrom(refusal, { paths })).toEqual({
      'address.street': ['No such street'],
    });
  });

  it('core reads a nested object of a JSON Schema as a section, and writes it back', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        address: {
          type: 'object',
          title: 'Ship to',
          required: ['street'],
          properties: {
            street: { type: 'string', title: 'Street' },
            city: { type: 'string', title: 'City' },
          },
        },
      },
    };
    const imported = fieldsFromJsonSchema(schema);
    expect(imported.warnings).toEqual([]);
    expect(imported.fields[1]?.section?.map((field) => field.name)).toEqual([
      'street',
      'city',
    ]);
    expect(fieldsToJsonSchema(imported.fields).schema).toEqual(schema);
  });

  it('react renders the section, stores an object and shows what a server refused', async () => {
    let form!: ReturnType<typeof useDynamicForm>;
    const Form = () => {
      form = useDynamicForm({
        fields,
        initialValues: { name: 'Ada' },
        validateOnChange: true,
      });
      return <MultiFieldInput fieldDescriptions={fields} form={form} />;
    };
    const { container } = render(<Form />);
    const input = (name: string) =>
      container.querySelector<HTMLInputElement>(`input[id$="-${name}"]`)!;
    const error = (name: string) =>
      container.querySelector(`[id="${input(name).id}-error"]`)?.textContent;

    expect(container.querySelector('fieldset legend')?.textContent).toBe(
      'Ship to',
    );
    expect(container.querySelector('fieldset')?.contains(input('city'))).toBe(
      true,
    );

    let submitted = false;
    await act(async () => {
      await form.handleSubmit(() => {
        submitted = true;
      })();
    });
    expect(submitted).toBe(false);
    expect(error('street')).toBe('Field is required');

    fireEvent.change(input('street'), { target: { value: '1 Le Loi' } });
    fireEvent.change(input('city'), { target: { value: 'Hue' } });
    expect(form.data).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });

    act(() =>
      form.setServerErrors(
        serverErrorsFrom(refusal, {
          paths: collectFieldPaths(fields, form.data),
        }),
      ),
    );
    expect(error('street')).toBe('No such street');
    fireEvent.change(input('street'), { target: { value: '2 Le Loi' } });
    expect(error('street')).toBeUndefined();
  });

  it('vue keeps the same behaviour', async () => {
    const form = useVueForm({ fields, initialValues: { name: 'Ada' } });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(VueMultiFieldInput, { fieldDescriptions: fields, form }),
      }),
    );
    expect(wrapper.find('fieldset legend').text()).toBe('Ship to');

    await wrapper.find('fieldset input[id$="-street"]').setValue('1 Le Loi');
    await wrapper.find('fieldset input[id$="-city"]').setValue('Hue');
    expect(form.data.value).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });

    form.setServerErrors({ 'address.street': 'No such street' });
    await flushPromises();
    const street = wrapper.find('fieldset input[id$="-street"]');
    expect(wrapper.find(`[id="${street.attributes('id')}-error"]`).text()).toBe(
      'No such street',
    );
  });
});
