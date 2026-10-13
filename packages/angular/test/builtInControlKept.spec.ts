import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { DynamicInput } from '../src/components/DynamicInput';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { fallbackRenderer, makeRegistry } from './helpers/renderers';

// A form that keeps what its fields report, the way an application's does.
@Component({
  selector: 'dfk-test-kept-host',
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <dfk-multi-field-input
      [fieldDescriptions]="fields"
      [properties]="data"
      (onChange)="data = $event"
    ></dfk-multi-field-input>
  `,
})
class HostComponent {
  @Input() fields: FieldDescription[] = [];
  @Input() data: Properties = {};
}

describe('the built-in controls, used when no renderer is registered', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    TestBed.configureTestingModule({
      imports: [DynamicInput, HostComponent],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mount(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(DynamicInput);
    const set = (next: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(next)) {
        fixture.componentRef.setInput(key, value);
      }
      fixture.detectChanges();
    };
    set(inputs);
    const all = <T extends Element>(selector: string): T[] =>
      Array.from(fixture.nativeElement.querySelectorAll(selector));
    return { fixture, set, all };
  }

  it('stay one element, the same one, while a form is typed in', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('fields', [{ name: 'name', type: 'text' }]);
    fixture.componentRef.setInput('data', { name: '' });
    fixture.detectChanges();
    const inputs = (): HTMLInputElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('input'));
    const first = inputs()[0]!;

    for (const text of ['A', 'Ad', 'Ada']) {
      // a user types in the input that is there, which is the first one
      first.value = text;
      first.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    expect(inputs()).toHaveLength(1);
    // built again, an input would lose the focus after every character
    expect(inputs()[0]).toBe(first);
    expect(first.value).toBe('Ada');
    expect(fixture.componentInstance.data).toEqual({ name: 'Ada' });
  });

  it('take a new value and new settings where they stand', () => {
    const { set, all } = mount({ type: 'text', value: 'one', id: 'f-name' });
    const input = all<HTMLInputElement>('input')[0]!;

    set({
      value: 'two',
      className: 'wide',
      placeholder: 'Name',
      disabled: true,
      readOnly: true,
      required: true,
    });
    expect(all('input')).toEqual([input]);
    expect(input.value).toBe('two');
    expect(input.className).toBe('wide');
    expect(input.placeholder).toBe('Name');
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.required).toBe(true);

    // and lose them again
    set({
      value: undefined,
      className: undefined,
      placeholder: undefined,
      disabled: false,
      readOnly: false,
      required: false,
    });
    expect(all('input')).toEqual([input]);
    expect(input.value).toBe('');
    expect(input.hasAttribute('class')).toBe(false);
    expect(input.hasAttribute('placeholder')).toBe(false);
    expect(input.disabled).toBe(false);
    expect(input.readOnly).toBe(false);
    expect(input.required).toBe(false);
    expect(input.id).toBe('f-name');
  });

  it('keep the aria flags current, and drop the reference to an error that is gone', () => {
    const { set, all } = mount({
      type: 'text',
      id: 'f-name',
      ariaInvalid: true,
      ariaRequired: true,
      ariaDescribedBy: 'f-name-error',
    });
    const input = all<HTMLInputElement>('input')[0]!;
    expect(input.getAttribute('aria-describedby')).toBe('f-name-error');

    set({ ariaInvalid: false, ariaDescribedBy: undefined });
    expect(all('input')).toEqual([input]);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('leave a number alone that reads the same as what is being typed', () => {
    const { set, all } = mount({ type: 'number', value: 1 });
    const input = all<HTMLInputElement>('input')[0]!;
    // typed "1.50": the field reported 1.5, and the text must not be rewritten to "1.5" under the caret
    input.value = '1.50';
    set({ value: 1.5 });
    expect(input.value).toBe('1.50');
    // a different number is shown
    set({ value: 2 });
    expect(input.value).toBe('2');
    set({ value: undefined });
    expect(input.value).toBe('');
    expect(all('input')).toEqual([input]);
  });

  it('keep a select and bring its options and its choice up to date', () => {
    const { set, all } = mount({
      type: 'select',
      value: 'a',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    });
    const select = all<HTMLSelectElement>('select')[0]!;
    expect(select.value).toBe('a');

    set({ value: 'b' });
    expect(all('select')).toEqual([select]);
    expect(select.value).toBe('b');

    set({ options: ['b', 'c'] });
    expect(all('select')).toEqual([select]);
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      '-- Select --',
      'b',
      'c',
    ]);
    expect(select.value).toBe('b');

    set({ disabled: true });
    expect(select.disabled).toBe(true);
    set({ disabled: false });
    expect(select.disabled).toBe(false);
  });

  it('keep a checkbox and a textarea', () => {
    const box = mount({ type: 'checkbox', value: false });
    const checkbox = box.all<HTMLInputElement>('input')[0]!;
    box.set({ value: true });
    expect(box.all('input')).toEqual([checkbox]);
    expect(checkbox.checked).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DynamicInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: makeRegistry() }],
    });
    const area = mount({ type: 'textarea', value: 'one' });
    const textarea = area.all<HTMLTextAreaElement>('textarea')[0]!;
    area.set({ value: 'two' });
    expect(area.all('textarea')).toEqual([textarea]);
    expect(textarea.value).toBe('two');
  });

  it('are replaced, not added to, when the type changes', () => {
    const { set, all } = mount({ type: 'text', value: 'x' });
    set({ type: 'checkbox', value: true });
    expect(all('input')).toHaveLength(1);
    expect(all<HTMLInputElement>('input')[0]!.type).toBe('checkbox');

    set({ type: 'textarea', value: 'text' });
    expect(all('input')).toHaveLength(0);
    expect(all('textarea')).toHaveLength(1);
  });

  it('show an unknown type once, however often the field changes', () => {
    const { fixture, set } = mount({ type: 'nope', value: 1 });
    set({ value: 2 });
    set({ value: 3 });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.match(/Unknown field type: nope/g)).toHaveLength(1);
  });

  it('show what a function renderer returns once, however often the field changes', () => {
    registry.register('text', fallbackRenderer as never);
    const { set, all } = mount({ type: 'text', label: 'Name', value: 'A' });
    set({ value: 'Ad' });
    set({ value: 'Ada' });
    expect(all('.fallback').map((node) => node.textContent)).toEqual([
      'Name:Ada',
    ]);
  });
});
