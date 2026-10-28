import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { FieldRegistry, validators } from '@dynamic-field-kit/core';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
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

// A form that keeps what its fields report, the way a host would.
function mountForm(
  fields: FieldDescription[],
  initial: Properties,
  props: Record<string, unknown> = {},
) {
  const data = ref<Properties>(initial);
  const Host = defineComponent({
    setup: () => () =>
      h(MultiFieldInput, {
        fieldDescriptions: fields,
        properties: data.value,
        onChange: (next: Properties) => {
          data.value = next;
        },
        ...props,
      }),
  });
  const wrapper = mount(Host, {
    global: { provide: { [FieldRegistryKey]: new FieldRegistry() } },
  });
  const input = (name: string) => wrapper.find(`input[id$="-${name}"]`);
  const value = (name: string) =>
    (input(name).element as HTMLInputElement).value;
  return { wrapper, data, input, value };
}

describe('a section', () => {
  it('shows its fields under its title, filled from the object it stores', () => {
    const { wrapper, value } = mountForm(person, {
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    const section = wrapper.find('fieldset.address-box');
    expect(section.find('legend').text()).toBe('Address');
    expect(value('street')).toBe('1 Le Loi');
    expect(value('city')).toBe('Hue');
    expect(section.find('input[id$="-street"]').exists()).toBe(true);
    // The field beside the section is not inside it.
    expect(section.find('input[id$="-name"]').exists()).toBe(false);
  });

  it('stores what is typed inside the object, next to what was there', async () => {
    const { data, input, value } = mountForm(person, {
      name: 'Ada',
      address: { city: 'Hue' },
    });
    await input('street').setValue('1 Le Loi');
    expect(data.value).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    expect(value('street')).toBe('1 Le Loi');
  });

  it('starts from nothing when the form has no object for it yet', async () => {
    const { data, input, value } = mountForm(person, { name: 'Ada' });
    expect(value('street')).toBe('');
    await input('city').setValue('Hue');
    expect(data.value).toEqual({ name: 'Ada', address: { city: 'Hue' } });
  });

  it('shows the errors and reports the blur of a field by its path', async () => {
    const onBlurField = vi.fn();
    const { wrapper, input } = mountForm(
      person,
      { address: {} },
      {
        errors: { 'address.street': ['No such street'] },
        touched: { 'address.street': true },
        onBlurField,
      },
    );
    const street = input('street');
    expect(street.attributes('aria-invalid')).toBe('true');
    expect(wrapper.find(`[id="${street.attributes('id')}-error"]`).text()).toBe(
      'No such street',
    );
    expect(input('city').attributes('aria-invalid')).toBe('false');

    await input('city').trigger('blur');
    expect(onBlurField).toHaveBeenCalledWith('address.city');
  });

  it('is left out while its condition says so', async () => {
    const fields = list([
      { name: 'ships', type: 'checkbox' },
      { ...person[1], appearCondition: (data: Properties) => data.ships },
    ]);
    const { wrapper, input } = mountForm(fields, { ships: false });
    expect(wrapper.find('fieldset').exists()).toBe(false);
    await input('ships').setValue(true);
    expect(wrapper.find('fieldset').exists()).toBe(true);
  });

  it('disables everything inside it when it is disabled', async () => {
    const fields = list([
      { name: 'same', type: 'checkbox' },
      { ...person[1], disabledCondition: (data: Properties) => data.same },
    ]);
    const { wrapper, input } = mountForm(fields, { same: true });
    const fieldset = () => wrapper.find('fieldset').element;
    expect(fieldset().disabled).toBe(true);
    expect(input('street').element.matches(':disabled')).toBe(true);
    await input('same').setValue(false);
    expect(fieldset().disabled).toBe(false);
  });

  it('is disabled by a disabledWhen rule written as data', async () => {
    const fields = list([
      { name: 'same', type: 'checkbox' },
      { ...person[1], disabledWhen: { field: 'same', truthy: true } },
    ]);
    const { wrapper, input } = mountForm(fields, { same: true });
    expect(wrapper.find('fieldset').element.disabled).toBe(true);
    await input('same').setValue(false);
    expect(wrapper.find('fieldset').element.disabled).toBe(false);
  });

  it('computes a value inside it from the section and from the form', async () => {
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
    const { data, input } = mountForm(fields, { name: 'Ada' });
    await input('city').setValue('Hue');
    expect(data.value).toEqual({
      name: 'Ada',
      address: { city: 'Hue', line: 'Ada @ Hue' },
    });
  });

  it('nests inside a repeatable group and inside another section', async () => {
    const fields = list([
      { name: 'contacts', type: 'text', fields: [person[1]] },
      { name: 'billing', type: 'text', label: 'Billing', section: [person[1]] },
    ]);
    const { wrapper, data } = mountForm(fields, {
      contacts: [{}],
      billing: {},
    });
    const cities = wrapper.findAll('input[id$="-city"]');
    expect(cities).toHaveLength(2);
    await cities[0]!.setValue('Hue');
    await wrapper.findAll('input[id$="-city"]')[1]!.setValue('Hanoi');
    expect(data.value).toEqual({
      contacts: [{ address: { city: 'Hue' } }],
      billing: { address: { city: 'Hanoi' } },
    });
    expect(wrapper.findAll('fieldset fieldset')).toHaveLength(1);
  });

  it('is validated, touched and refused by a server through a form', async () => {
    const form = useDynamicForm({
      fields: person,
      initialValues: { name: 'Ada' },
      validateOnChange: true,
    });
    const onValid = vi.fn();
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(MultiFieldInput, { fieldDescriptions: person, form }),
      }),
      { global: { provide: { [FieldRegistryKey]: new FieldRegistry() } } },
    );
    const street = () => wrapper.find('input[id$="-street"]');
    const error = () => {
      const node = wrapper.find(`[id="${street().attributes('id')}-error"]`);
      return node.exists() ? node.text() : undefined;
    };

    await form.handleSubmit(onValid)();
    await flushPromises();
    expect(onValid).not.toHaveBeenCalled();
    expect(form.errors.value).toEqual({
      'address.street': ['Field is required'],
    });
    expect(form.touched.value['address.street']).toBe(true);
    expect(error()).toBe('Field is required');

    await street().setValue('1 Le Loi');
    expect(form.data.value).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi' },
    });
    expect(error()).toBeUndefined();

    form.setServerErrors({ 'address.street': 'No such street' });
    await flushPromises();
    expect(error()).toBe('No such street');
    // Another field of the section changes: the refusal stands.
    await wrapper.find('input[id$="-city"]').setValue('Hue');
    expect(error()).toBe('No such street');
    await street().setValue('2 Le Loi');
    expect(error()).toBeUndefined();
  });
});
