import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { validators } from '@dynamic-field-kit/core';
import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { createDynamicFormStore } from '../src/lib/dynamic-form.store';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

// The registry's field types are open-ended; these tests use plain strings.
const list = (fields: unknown[]) => fields as FieldDescription[];

const address = {
  name: 'address',
  type: 'text',
  label: 'Address',
  className: 'address-box',
  section: [
    { name: 'street', type: 'text', validate: validators.required() },
    { name: 'city', type: 'text' },
  ],
};
const person = list([{ name: 'name', type: 'text' }, address]);

// A form that keeps what its fields report, the way an application's does.
@Component({
  selector: 'dfk-test-section-host',
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <dfk-multi-field-input
      [fieldDescriptions]="fields"
      [properties]="data"
      [errors]="errors"
      [touched]="touched"
      (onChange)="data = $event"
      (onBlurField)="blurred.push($event)"
    ></dfk-multi-field-input>
  `,
})
class HostComponent {
  @Input() fields: FieldDescription[] = [];
  @Input() data: Properties = {};
  @Input() errors?: Record<string, string[]>;
  @Input() touched?: Record<string, boolean>;
  blurred: string[] = [];
}

// The same form driven by a form store.
@Component({
  selector: 'dfk-test-section-store-host',
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <dfk-multi-field-input
      [fieldDescriptions]="fields"
      [properties]="store.data()"
      [errors]="store.errors()"
      [touched]="store.touched()"
      (onChange)="store.handleChange($event)"
      (onBlurField)="store.handleBlur($event)"
    ></dfk-multi-field-input>
  `,
})
class StoreHostComponent {
  fields = person;
  store = createDynamicFormStore({
    fields: person,
    initialValues: { name: 'Ada' },
    validateOnChange: true,
  });
}

describe('a section', () => {
  beforeEach(() => {
    const registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [HostComponent, StoreHostComponent],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function tools(fixture: {
    nativeElement: HTMLElement;
    detectChanges: () => void;
    whenStable: () => Promise<unknown>;
  }) {
    const inputs = (): HTMLInputElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('input.txt'));
    const type = async (element: HTMLInputElement, text: string) => {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const errorOf = (element: HTMLInputElement) =>
      element.closest('dfk-test-text')?.querySelector('.err')?.textContent;
    return { inputs, type, errorOf };
  }

  function mount(
    fields: FieldDescription[],
    data: Properties,
    more: Record<string, unknown> = {},
  ) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('data', data);
    for (const [key, value] of Object.entries(more)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return { fixture, ...tools(fixture) };
  }

  it('shows its fields under its title, filled from the object it stores', () => {
    const { fixture, inputs } = mount(person, {
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    const section: HTMLElement = fixture.nativeElement.querySelector(
      'fieldset.address-box',
    );
    expect(section.querySelector('legend')?.textContent?.trim()).toBe(
      'Address',
    );
    expect(inputs().map((input) => input.value)).toEqual([
      'Ada',
      '1 Le Loi',
      'Hue',
    ]);
    // The field beside the section is not inside it.
    expect(inputs().map((input) => section.contains(input))).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('stores what is typed inside the object, next to what was there', async () => {
    const { fixture, inputs, type } = mount(person, {
      name: 'Ada',
      address: { city: 'Hue' },
    });
    await type(inputs()[1]!, '1 Le Loi');
    expect(fixture.componentInstance.data).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi', city: 'Hue' },
    });
    expect(inputs()[1]!.value).toBe('1 Le Loi');
  });

  it('starts from nothing when the form has no object for it yet', async () => {
    const { fixture, inputs, type } = mount(person, { name: 'Ada' });
    expect(inputs()[1]!.value).toBe('');
    await type(inputs()[2]!, 'Hue');
    expect(fixture.componentInstance.data).toEqual({
      name: 'Ada',
      address: { city: 'Hue' },
    });
  });

  it('shows the errors and reports the blur of a field by its path', () => {
    const { fixture, inputs, errorOf } = mount(
      person,
      { address: {} },
      {
        errors: { 'address.street': ['No such street'] },
        touched: { 'address.street': true },
      },
    );
    expect(errorOf(inputs()[1]!)).toBe('No such street');
    expect(errorOf(inputs()[2]!)).toBeUndefined();

    inputs()[2]!.dispatchEvent(new Event('focusout', { bubbles: true }));
    expect(fixture.componentInstance.blurred).toEqual(['address.city']);
  });

  it('is left out while its condition says so', () => {
    const fields = list([
      { name: 'name', type: 'text' },
      { ...address, appearCondition: (data: Properties) => data['ships'] },
    ]);
    const { fixture } = mount(fields, { ships: false });
    expect(fixture.nativeElement.querySelector('fieldset')).toBeNull();
    fixture.componentRef.setInput('data', { ships: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset')).not.toBeNull();
  });

  it('disables everything inside it when it is disabled', () => {
    const fields = list([
      { name: 'name', type: 'text' },
      { ...address, disabledCondition: (data: Properties) => data['same'] },
    ]);
    const { fixture, inputs } = mount(fields, { same: true });
    const fieldset = (): HTMLFieldSetElement =>
      fixture.nativeElement.querySelector('fieldset');
    expect(fieldset().disabled).toBe(true);
    expect(inputs()[1]!.matches(':disabled')).toBe(true);
    fixture.componentRef.setInput('data', { same: false });
    fixture.detectChanges();
    expect(fieldset().disabled).toBe(false);
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
              `${root?.['name'] ?? ''} @ ${data['city'] ?? ''}`,
          },
        ],
      },
    ]);
    const { fixture, inputs, type } = mount(fields, { name: 'Ada' });
    await type(inputs()[1]!, 'Hue');
    expect(fixture.componentInstance.data).toEqual({
      name: 'Ada',
      address: { city: 'Hue', line: 'Ada @ Hue' },
    });
  });

  it('nests inside a repeatable group and inside another section', async () => {
    const fields = list([
      { name: 'contacts', type: 'text', fields: [address] },
      { name: 'billing', type: 'text', label: 'Billing', section: [address] },
    ]);
    const { fixture, inputs, type } = mount(fields, {
      contacts: [{}],
      billing: {},
    });
    // street and city of the contact, then street and city of billing.
    expect(inputs()).toHaveLength(4);
    await type(inputs()[1]!, 'Hue');
    await type(inputs()[3]!, 'Hanoi');
    expect(fixture.componentInstance.data).toEqual({
      contacts: [{ address: { city: 'Hue' } }],
      billing: { address: { city: 'Hanoi' } },
    });
    expect(
      fixture.nativeElement.querySelectorAll('fieldset fieldset'),
    ).toHaveLength(1);
  });

  it('is validated, touched and refused by a server through a form', async () => {
    const fixture = TestBed.createComponent(StoreHostComponent);
    fixture.detectChanges();
    const { inputs, type, errorOf } = tools(fixture);
    const store = fixture.componentInstance.store;
    const onValid = vi.fn();
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    await store.handleSubmit(onValid)();
    await settle();
    expect(onValid).not.toHaveBeenCalled();
    expect(store.errors()).toEqual({
      'address.street': ['Field is required'],
    });
    expect(store.touched()['address.street']).toBe(true);
    expect(errorOf(inputs()[1]!)).toBe('Field is required');

    await type(inputs()[1]!, '1 Le Loi');
    expect(store.data()).toEqual({
      name: 'Ada',
      address: { street: '1 Le Loi' },
    });
    expect(errorOf(inputs()[1]!)).toBeUndefined();

    store.setServerErrors({ 'address.street': 'No such street' });
    await settle();
    expect(errorOf(inputs()[1]!)).toBe('No such street');
    // Another field of the section changes: the refusal stands.
    await type(inputs()[2]!, 'Hue');
    expect(errorOf(inputs()[1]!)).toBe('No such street');
    await type(inputs()[1]!, '2 Le Loi');
    expect(errorOf(inputs()[1]!)).toBeUndefined();
  });
});
