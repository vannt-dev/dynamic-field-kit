import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FieldDescription } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

// The registry's field types are open-ended; these tests use plain strings.
const list = (fields: unknown[]) => fields as FieldDescription[];

@Component({
  selector: 'dfk-test-label-host',
  standalone: true,
  imports: [MultiFieldInput],
  template: `
    <dfk-multi-field-input
      [fieldDescriptions]="fields"
      [properties]="{}"
      [errors]="errors"
      idPrefix="f"
    ></dfk-multi-field-input>
  `,
})
class HostComponent {
  @Input() fields: FieldDescription[] = [];
  @Input() errors?: Record<string, string[]>;
}

// The types the Angular fallback draws a control for.
const builtIn = [
  'text',
  'password',
  'email',
  'number',
  'textarea',
  'checkbox',
  'select',
];

/** The control a label names, the way assistive technology finds it. */
function byLabelText(root: HTMLElement, text: string): HTMLElement {
  const label = Array.from(root.querySelectorAll('label')).find(
    (element) => element.textContent?.trim() === text,
  );
  const control = label?.htmlFor
    ? root.querySelector<HTMLElement>(`[id="${label.htmlFor}"]`)
    : null;
  if (!control) {
    throw new Error(`no control labelled "${text}"`);
  }
  expect(
    Array.from((control as HTMLInputElement).labels ?? []).includes(label!),
  ).toBe(true);
  return control;
}

describe('built-in controls', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  function mount(
    fields: FieldDescription[],
    errors?: Record<string, string[]>,
  ): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('errors', errors);
    fixture.detectChanges();
    // The control is drawn after the view is checked; check it once more.
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    return fixture.nativeElement as HTMLElement;
  }

  it.each(builtIn)('label a %s control with <label for>', (type) => {
    const root = mount(
      list([{ name: 'x', type, label: `The ${type}`, options: [] }]),
    );
    const control = byLabelText(root, `The ${type}`);
    expect(control.id).toBe('f-x');
  });

  it('keep label, control and message together in one element', () => {
    const root = mount(
      list([{ name: 'email', type: 'email', label: 'Email' }]),
      {
        email: ['Invalid email'],
      },
    );
    const field = root.querySelector('.dfk-field')!;
    const control = byLabelText(root, 'Email');
    expect(field.contains(control)).toBe(true);
    expect(control.getAttribute('aria-invalid')).toBe('true');
    const message = root.querySelector(
      `[id="${control.getAttribute('aria-describedby')}"]`,
    );
    expect(message?.textContent?.trim()).toBe('Invalid email');
    expect(field.contains(message)).toBe(true);
  });

  it('draw no label for a field without one', () => {
    const root = mount(list([{ name: 'x', type: 'text' }]));
    expect(root.querySelector('.dfk-field-label')).toBeNull();
    expect(root.querySelector('.dfk-field input')).not.toBeNull();
  });

  it('leave a registered renderer as it was: no label', () => {
    registry.register('text', TextRendererComponent as never);
    const root = mount(list([{ name: 'x', type: 'text', label: 'X' }]));
    expect(root.querySelector('input.txt')).not.toBeNull();
    expect(root.querySelector('.dfk-field')).toBeNull();
    expect(root.querySelector('label')).toBeNull();
  });
});
