import { TestBed } from '@angular/core/testing';
import type {
  FieldDescription,
  ValidationResult,
} from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

describe('MultiFieldInput', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mount(
    fields: FieldDescription[],
    properties: Record<string, unknown>,
  ) {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', fields);
    fixture.componentRef.setInput('properties', properties);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one input per field', () => {
    const fixture = mount(
      [
        { name: 'first', type: 'text' },
        { name: 'last', type: 'text' },
      ],
      { first: 'Ada', last: 'Lovelace' },
    );

    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input.txt'),
    );
    expect(inputs.map((i) => i.value)).toEqual(['Ada', 'Lovelace']);
  });

  it('hides fields whose appearCondition is false', () => {
    const fields: FieldDescription[] = [
      { name: 'kind', type: 'text' },
      {
        name: 'company',
        type: 'text',
        appearCondition: (data) => data['kind'] === 'business',
      },
    ];

    expect(
      mount(fields, { kind: 'personal' }).nativeElement.querySelectorAll(
        'input.txt',
      ).length,
    ).toBe(1);
    expect(
      mount(fields, { kind: 'business' }).nativeElement.querySelectorAll(
        'input.txt',
      ).length,
    ).toBe(2);
  });

  it('applies computeValue to the data it emits', () => {
    const fields: FieldDescription[] = [
      { name: 'price', type: 'text' },
      {
        name: 'total',
        type: 'text',
        computeValue: (data) => `${Number(data['price']) * 2}`,
      },
    ];

    const fixture = mount(fields, { price: '5' });

    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input.txt'),
    );
    expect(inputs[1].value).toBe('10');
  });

  it('emits onChange with the updated data when a field changes', () => {
    const fixture = mount([{ name: 'first', type: 'text' }], { first: 'Ada' });

    const seen: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((d) => seen.push(d));

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));

    expect(seen).toEqual([{ first: 'Grace' }]);
  });

  it('passes validation errors down to the renderer', () => {
    const fixture = mount(
      [
        {
          name: 'email',
          type: 'text',
          validate: (value) =>
            String(value).includes('@') ? undefined : 'Invalid email',
        },
      ],
      { email: 'nope' },
    );

    expect(fixture.nativeElement.querySelector('.err').textContent).toBe(
      'Invalid email',
    );
  });

  it('resolves disabledCondition and readOnlyCondition', () => {
    const fixture = mount(
      [
        {
          name: 'a',
          type: 'text',
          disabledCondition: (data) => data['frozen'] === true,
        },
        {
          name: 'b',
          type: 'text',
          readOnlyCondition: (data) => data['frozen'] === true,
        },
      ],
      { frozen: true },
    );

    const inputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input.txt'),
    );
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[1].readOnly).toBe(true);
  });

  it('does not report errors for disabled fields', () => {
    const fixture = mount(
      [
        {
          name: 'email',
          type: 'text',
          disabled: true,
          validate: () => 'Invalid email',
        },
      ],
      { email: 'nope' },
    );

    expect(fixture.nativeElement.querySelector('.err')).toBeNull();
  });

  it('emits validityChange on init and on every change', () => {
    const seen: ValidationResult[] = [];
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentInstance.validityChange.subscribe((r) => seen.push(r));
    fixture.componentRef.setInput('fieldDescriptions', [
      {
        name: 'email',
        type: 'text',
        validate: (value: unknown) =>
          String(value).includes('@') ? undefined : 'Invalid email',
      },
    ]);
    fixture.componentRef.setInput('properties', { email: 'nope' });
    fixture.detectChanges();

    expect(seen[seen.length - 1]).toEqual({
      valid: false,
      errors: { email: ['Invalid email'] },
      complete: true,
      status: 'invalid',
    });

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'ada@example.com';
    input.dispatchEvent(new Event('input'));

    expect(seen[seen.length - 1]).toEqual({
      valid: true,
      errors: {},
      complete: true,
      status: 'valid',
    });
  });

  it('renders a repeatable group item per entry and adds one on Add', () => {
    const fields: FieldDescription[] = [
      {
        name: 'contacts',
        type: 'text',
        label: 'Contacts',
        fields: [{ name: 'email', type: 'text' }],
      },
    ];

    const fixture = mount(fields, {
      contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    });

    expect(fixture.nativeElement.querySelectorAll('input.txt').length).toBe(2);

    const seen: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((d) => seen.push(d));

    const addBtn: HTMLButtonElement = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Add')!;
    addBtn.click();
    fixture.detectChanges();

    expect((seen[0] as Record<string, unknown[]>)['contacts'].length).toBe(3);
  });

  it('removes a group item on Remove', () => {
    const fields: FieldDescription[] = [
      {
        name: 'contacts',
        type: 'text',
        fields: [{ name: 'email', type: 'text' }],
      },
    ];

    const fixture = mount(fields, {
      contacts: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
    });

    const seen: unknown[] = [];
    fixture.componentInstance.onChange.subscribe((d) => seen.push(d));

    const removeBtn: HTMLButtonElement = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((b) => b.textContent?.trim() === 'Remove')!;
    removeBtn.click();
    fixture.detectChanges();

    expect((seen[0] as Record<string, unknown[]>)['contacts']).toEqual([
      { email: 'b@x.com' },
    ]);
  });

  it('applies the grid layout', () => {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', [
      { name: 'a', type: 'text' },
    ]);
    fixture.componentRef.setInput('properties', { a: '1' });
    fixture.componentRef.setInput('layout', { type: 'grid', columns: 3 });
    fixture.detectChanges();

    const container: HTMLElement = fixture.nativeElement.firstElementChild;
    expect(container.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
  });
});
