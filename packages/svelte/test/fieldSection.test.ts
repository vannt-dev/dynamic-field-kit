import {
  validators,
  type FieldDescription,
  type Properties,
} from '@dynamic-field-kit/core';
import { describe, expect, it, vi } from 'vitest';
import MultiFieldInput from '../src/components/MultiFieldInput.svelte';
import '../src/layout/defaultLayouts';
import FormHarness from './fixtures/FormHarness.svelte';
import {
  act,
  click,
  fire,
  probeRegistry,
  render,
  settle,
  type,
} from './helpers';

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

const input = (target: Element, name: string) =>
  target.querySelector<HTMLInputElement>(`input[id$="-${name}"]`)!;

// The component with what it reports kept, the way a host would keep it.
function mountFields(
  fields: FieldDescription[],
  properties: Properties,
  props: Record<string, unknown> = {},
) {
  const latest: { data: Properties } = { data: properties };
  const { target } = render(
    MultiFieldInput,
    {
      fieldDescriptions: fields,
      properties,
      onChange: (next: Properties) => {
        latest.data = next;
      },
      ...props,
    },
    probeRegistry(),
  );
  return { target, latest };
}

describe('a section', () => {
  it('shows its fields under its title, filled from the object it stores', () => {
    const { target } = mountFields(person, {
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    const section = target.querySelector('fieldset.address-box')!;
    expect(section.querySelector('legend')?.textContent).toBe('Address');
    expect(input(section, 'street').value).toBe('1 Le Loi');
    expect(input(section, 'city').value).toBe('Hue');
    // The field beside the section is not inside it.
    expect(section.contains(input(target, 'name'))).toBe(false);
  });

  it('stores what is typed inside the object, next to what was there', () => {
    const { target, latest } = mountFields(person, {
      name: 'Ada',
      address: { city: 'Hue' },
    });
    type(input(target, 'street'), '1 Le Loi');
    expect(latest.data).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    expect(input(target, 'street').value).toBe('1 Le Loi');
  });

  it('starts from nothing when the form has no object for it yet', () => {
    const { target, latest } = mountFields(person, { name: 'Ada' });
    expect(input(target, 'street').value).toBe('');
    type(input(target, 'city'), 'Hue');
    expect(latest.data).toEqual({ name: 'Ada', address: { city: 'Hue' } });
  });

  it('shows the errors and reports the blur of a field by its path', () => {
    const onBlurField = vi.fn();
    const { target } = mountFields(
      person,
      { address: {} },
      {
        errors: { 'address.street': ['No such street'] },
        touched: { 'address.street': true },
        onBlurField,
      },
    );
    const street = input(target, 'street');
    expect(street.getAttribute('aria-invalid')).toBe('true');
    expect(
      target.querySelector(`[id="${street.id}-error"]`)?.textContent?.trim(),
    ).toBe('No such street');
    expect(input(target, 'city').getAttribute('aria-invalid')).toBe('false');

    fire(input(target, 'city'), 'blur');
    expect(onBlurField).toHaveBeenCalledWith('address.city');
  });

  it('is left out while its condition says so', () => {
    const fields = list([
      { name: 'ships', type: 'checkbox' },
      { ...person[1], appearCondition: (data: Properties) => data.ships },
    ]);
    const { target } = mountFields(fields, { ships: false });
    expect(target.querySelector('fieldset')).toBeNull();
    click(input(target, 'ships'));
    expect(target.querySelector('fieldset')).not.toBeNull();
  });

  it('disables everything inside it when it is disabled', () => {
    const fields = list([
      { name: 'same', type: 'checkbox' },
      { ...person[1], disabledCondition: (data: Properties) => data.same },
    ]);
    const { target } = mountFields(fields, { same: true });
    expect(target.querySelector('fieldset')?.disabled).toBe(true);
    expect(input(target, 'street').matches(':disabled')).toBe(true);
    click(input(target, 'same'));
    expect(target.querySelector('fieldset')?.disabled).toBe(false);
  });

  it('is disabled by a disabledWhen rule written as data', () => {
    const fields = list([
      { name: 'same', type: 'checkbox' },
      { ...person[1], disabledWhen: { field: 'same', truthy: true } },
    ]);
    const { target } = mountFields(fields, { same: true });
    expect(target.querySelector('fieldset')?.disabled).toBe(true);
    click(input(target, 'same'));
    expect(target.querySelector('fieldset')?.disabled).toBe(false);
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
    const { target, latest } = mountFields(fields, { name: 'Ada' });
    type(input(target, 'city'), 'Hue');
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
    const { target, latest } = mountFields(fields, {
      contacts: [{}],
      billing: {},
    });
    const cities = () =>
      target.querySelectorAll<HTMLInputElement>('input[id$="-city"]');
    expect(cities()).toHaveLength(2);
    type(cities()[0]!, 'Hue');
    type(cities()[1]!, 'Hanoi');
    expect(latest.data).toEqual({
      contacts: [{ address: { city: 'Hue' } }],
      billing: { address: { city: 'Hanoi' } },
    });
    expect(target.querySelectorAll('fieldset fieldset')).toHaveLength(1);
  });

  it('is validated, touched and refused by a server through a form', async () => {
    const onSubmitted = vi.fn();
    const { target, instance } = render(
      FormHarness,
      {
        fields: person,
        initialValues: { name: 'Ada' },
        validateOnChange: true,
        onSubmitted,
      },
      probeRegistry(),
    );
    const form = (
      instance as unknown as {
        getForm: () => {
          data: Properties;
          errors: Record<string, string[]>;
          touched: Record<string, boolean>;
          setServerErrors: (errors: Record<string, string>) => void;
        };
      }
    ).getForm();
    const street = () => input(target, 'street');
    const error = () =>
      target.querySelector(`[id="${street().id}-error"]`)?.textContent?.trim();

    click(target.querySelector('button[type="submit"]')!);
    await settle();
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(form.errors).toEqual({ 'address.street': ['Field is required'] });
    expect(form.touched['address.street']).toBe(true);
    expect(error()).toBe('Field is required');

    type(street(), '1 Le Loi');
    await settle();
    expect(form.data).toEqual({ name: 'Ada', address: { street: '1 Le Loi' } });
    expect(error()).toBeUndefined();

    act(() => form.setServerErrors({ 'address.street': 'No such street' }));
    expect(error()).toBe('No such street');
    // Another field of the section changes: the refusal stands.
    type(input(target, 'city'), 'Hue');
    await settle();
    expect(error()).toBe('No such street');
    type(street(), '2 Le Loi');
    await settle();
    expect(error()).toBeUndefined();
  });
});
