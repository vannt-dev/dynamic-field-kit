import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { validators } from '@dynamic-field-kit/core';
import { act, fireEvent, render } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput';
import '../src/layout/defaultLayouts';
import { useDynamicForm } from '../src/useDynamicForm';

// The registry's field types are open-ended; these tests use plain strings.
const list = (fields: unknown[]) => fields as FieldDescription[];

const person = list([
  { name: 'name', type: 'text' },
  {
    name: 'address',
    type: 'text',
    label: 'Address',
    className: 'address-box',
    section: [
      { name: 'street', type: 'text', validate: validators.required() },
      { name: 'city', type: 'text' },
    ],
  },
]);

const input = (container: Element, name: string) =>
  container.querySelector<HTMLInputElement>(`input[id$="-${name}"]`)!;
const type = (element: Element, value: string) =>
  fireEvent.change(element, { target: { value } });

// A form that keeps what its fields report, the way a host would.
function renderForm(
  fields: FieldDescription[],
  initial: Properties,
  props: Partial<React.ComponentProps<typeof MultiFieldInput>> = {},
) {
  const latest: { data: Properties } = { data: initial };
  const Form = () => {
    const [data, setData] = useState(initial);
    latest.data = data;
    return (
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={data}
        onChange={setData}
        {...props}
      />
    );
  };
  return { ...render(<Form />), latest };
}

describe('a section', () => {
  it('shows its fields under its title, filled from the object it stores', () => {
    const { container } = renderForm(person, {
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    const section = container.querySelector('fieldset.address-box')!;
    expect(section.querySelector('legend')?.textContent).toBe('Address');
    expect(input(section, 'street').value).toBe('1 Le Loi');
    expect(input(section, 'city').value).toBe('Hue');
    // The field beside the section is not inside it.
    expect(section.contains(input(container, 'name'))).toBe(false);
  });

  it('stores what is typed inside the object, next to what was there', () => {
    const { container, latest } = renderForm(person, {
      name: 'Ada',
      address: { city: 'Hue' },
    });
    type(input(container, 'street'), '1 Le Loi');
    expect(latest.data).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    expect(input(container, 'street').value).toBe('1 Le Loi');
  });

  it('starts from nothing when the form has no object for it yet', () => {
    const { container, latest } = renderForm(person, { name: 'Ada' });
    expect(input(container, 'street').value).toBe('');
    type(input(container, 'city'), 'Hue');
    expect(latest.data).toEqual({ name: 'Ada', address: { city: 'Hue' } });
  });

  it('shows the errors and reports the blur of a field by its path', () => {
    const onBlurField = vi.fn();
    const { container } = renderForm(
      person,
      { address: {} },
      {
        errors: { 'address.street': ['No such street'] },
        touched: { 'address.street': true },
        onBlurField,
      },
    );
    const street = input(container, 'street');
    expect(street.getAttribute('aria-invalid')).toBe('true');
    expect(
      container.querySelector(`[id="${street.id}-error"]`)?.textContent,
    ).toBe('No such street');
    expect(input(container, 'city').getAttribute('aria-invalid')).toBe('false');

    fireEvent.blur(input(container, 'city'));
    expect(onBlurField).toHaveBeenCalledWith('address.city');
  });

  it('is left out while its condition says so', () => {
    const fields = list([
      { name: 'ships', type: 'checkbox' },
      { ...person[1], appearCondition: (data: Properties) => data.ships },
    ]);
    const { container } = renderForm(fields, { ships: false });
    expect(container.querySelector('fieldset')).toBeNull();
    fireEvent.click(input(container, 'ships'));
    expect(container.querySelector('fieldset')).not.toBeNull();
  });

  it('disables everything inside it when it is disabled', () => {
    const fields = list([
      { name: 'same', type: 'checkbox' },
      { ...person[1], disabledCondition: (data: Properties) => data.same },
    ]);
    const { container } = renderForm(fields, { same: true });
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    expect(input(container, 'street').matches(':disabled')).toBe(true);
    fireEvent.click(input(container, 'same'));
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
  });

  it('is disabled by a disabledWhen rule written as data', () => {
    const fields = list([
      { name: 'same', type: 'checkbox' },
      { ...person[1], disabledWhen: { field: 'same', truthy: true } },
    ]);
    const { container } = renderForm(fields, { same: true });
    expect(container.querySelector('fieldset')?.disabled).toBe(true);
    fireEvent.click(input(container, 'same'));
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
  });

  it('computes a value inside it from the section and from the form', () => {
    const fields = list([
      { name: 'name', type: 'text' },
      {
        name: 'address',
        type: 'text',
        section: [
          { name: 'city', type: 'text' },
          {
            name: 'line',
            type: 'text',
            computeValue: (data: Properties, root?: Properties) =>
              `${root?.name ?? ''} @ ${data.city ?? ''}`,
          },
        ],
      },
    ]);
    const { container, latest } = renderForm(fields, { name: 'Ada' });
    type(input(container, 'city'), 'Hue');
    expect(latest.data).toEqual({
      name: 'Ada',
      address: { city: 'Hue', line: 'Ada @ Hue' },
    });
  });

  it('nests inside a repeatable group and inside another section', () => {
    const fields = list([
      { name: 'contacts', type: 'text', fields: [person[1]] },
      { name: 'billing', type: 'text', label: 'Billing', section: [person[1]] },
    ]);
    const { container, latest } = renderForm(fields, {
      contacts: [{}],
      billing: {},
    });
    const cities =
      container.querySelectorAll<HTMLInputElement>('input[id$="-city"]');
    expect(cities).toHaveLength(2);
    type(cities[0]!, 'Hue');
    type(cities[1]!, 'Hanoi');
    expect(latest.data).toEqual({
      contacts: [{ address: { city: 'Hue' } }],
      billing: { address: { city: 'Hanoi' } },
    });
    expect(container.querySelectorAll('fieldset fieldset')).toHaveLength(1);
  });

  it('is validated, touched and refused by a server through a form', async () => {
    let form!: ReturnType<typeof useDynamicForm>;
    const onValid = vi.fn();
    const Form = () => {
      form = useDynamicForm({
        fields: person,
        initialValues: { name: 'Ada' },
        validateOnChange: true,
      });
      return <MultiFieldInput fieldDescriptions={person} form={form} />;
    };
    const { container } = render(<Form />);
    const street = () => input(container, 'street');
    const error = () =>
      container.querySelector(`[id="${street().id}-error"]`)?.textContent;

    await act(async () => {
      await form.handleSubmit(onValid)();
    });
    expect(onValid).not.toHaveBeenCalled();
    expect(form.errors).toEqual({ 'address.street': ['Field is required'] });
    expect(form.touched['address.street']).toBe(true);
    expect(error()).toBe('Field is required');

    type(street(), '1 Le Loi');
    expect(form.data).toEqual({ name: 'Ada', address: { street: '1 Le Loi' } });
    expect(error()).toBeUndefined();

    act(() => form.setServerErrors({ 'address.street': 'No such street' }));
    expect(error()).toBe('No such street');
    // Another field of the section changes: the refusal stands.
    type(input(container, 'city'), 'Hue');
    expect(error()).toBe('No such street');
    type(street(), '2 Le Loi');
    expect(error()).toBeUndefined();
  });
});
