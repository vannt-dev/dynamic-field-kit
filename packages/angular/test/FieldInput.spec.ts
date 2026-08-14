import { NgFor } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseInputComponent } from '../src/components/BaseInput';
import { FieldInput } from '../src/components/FieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import {
  DefaultsRendererComponent,
  makeRegistry,
  TextRendererComponent,
} from './helpers/renderers';

/**
 * Renders whatever `options` it is handed, so the tests below can assert on
 * what actually reached the renderer instead of reading FieldInput's getter.
 * `.opt` absent means the renderer received no options at all.
 */
@Component({
  selector: 'dfk-test-options',
  standalone: true,
  imports: [NgFor],
  template: `<span class="opt" *ngFor="let o of options">{{
    $any(o).label
  }}</span>`,
})
class OptionsRendererComponent {
  @Input() options?: Record<string, unknown>[];
}

describe('FieldInput', () => {
  let registry: ReturnType<typeof makeRegistry>;

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [FieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  it('renders nothing once fieldDescription is cleared', () => {
    // Mounting with no inputs at all passes on the `shouldRender = false`
    // field initializer without ever exercising ngOnChanges's guard. Mount
    // WITH a fieldDescription first, then clear it, so the assertion
    // actually depends on `shouldRender = !!this.fieldDescription`.
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input.txt')).not.toBeNull();

    fixture.componentRef.setInput('fieldDescription', undefined);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input.txt')).toBeNull();
  });

  it('renders the field described by fieldDescription', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
      placeholder: 'First name',
    });
    fixture.componentRef.setInput('value', 'Ada');
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input.value).toBe('Ada');
    expect(input.placeholder).toBe('First name');
  });

  it('emits onValueChangeField with the field name as key', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
    });
    fixture.detectChanges();

    const seen: unknown[] = [];
    fixture.componentInstance.onValueChangeField.subscribe((e) => seen.push(e));

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));

    expect(seen).toEqual([{ value: 'Grace', key: 'first' }]);
  });

  it('forwards error, disabled and readOnly to the renderer', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'email',
      type: 'text',
    });
    fixture.componentRef.setInput('error', ['Required', 'Invalid']);
    fixture.componentRef.setInput('disabled', true);
    fixture.componentRef.setInput('readOnly', true);
    fixture.detectChanges();

    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input.txt');
    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(fixture.nativeElement.querySelector('.err').textContent).toBe(
      'Required, Invalid'
    );
  });

  it('forwards FieldDescription.props as extraProps', () => {
    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'text',
      props: { hint: 'keep it short' },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hint').textContent).toBe(
      'keep it short'
    );
  });

  it('documents current behaviour: a renderer default IS overwritten on the real FieldInput path', () => {
    // Unlike mounting DynamicInput directly, FieldInput's template binds
    // every KNOWN_PROP unconditionally, so DynamicInput sees a firstChange
    // SimpleChange for `label` even though fieldDescription never set one.
    // The `supplied` gate in DynamicInput.applyProps therefore does NOT
    // protect the renderer's own default here - this pins that fact rather
    // than asserting a guarantee that doesn't hold on this path.
    registry.register('defaults', DefaultsRendererComponent as never);

    const fixture = TestBed.createComponent(FieldInput);
    fixture.componentRef.setInput('fieldDescription', {
      name: 'first',
      type: 'defaults',
      // label intentionally omitted.
    });
    fixture.detectChanges();

    const label: HTMLElement = fixture.nativeElement.querySelector('.label');
    expect(label.textContent).toBe('');
  });
});

describe('FieldInput option resolution', () => {
  let registry: ReturnType<typeof makeRegistry>;

  function mount(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(FieldInput);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return fixture;
  }

  function renderedOptions(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.opt')).map((n) =>
      (n.textContent || '').trim()
    );
  }

  beforeEach(() => {
    registry = makeRegistry();
    registry.register('select', OptionsRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [FieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  it("prefers the explicit options input over the field's own options", () => {
    // MultiFieldInput resolves options against the live form data and passes
    // the result down, so the input has to win over whatever the schema says.
    const fixture = mount({
      fieldDescription: {
        name: 'city',
        type: 'select',
        options: [{ label: 'from schema' }],
      },
      options: [{ label: 'from parent' }],
    });

    expect(renderedOptions(fixture)).toEqual(['from parent']);
  });

  it('passes a static options array from the field description straight down', () => {
    const fixture = mount({
      fieldDescription: {
        name: 'city',
        type: 'select',
        options: [{ label: 'Hanoi' }, { label: 'HCM' }],
      },
    });

    expect(renderedOptions(fixture)).toEqual(['Hanoi', 'HCM']);
  });

  it('withholds a dynamic options callback instead of passing the function down', () => {
    // A callback needs the form data to resolve, which FieldInput does not
    // have -- only MultiFieldInput does, and it passes the result via the
    // `options` input. Handing the raw function to a renderer would make it
    // try to iterate a function.
    const resolve = vi.fn(() => [{ label: 'never called here' }]);

    const fixture = mount({
      fieldDescription: { name: 'city', type: 'select', options: resolve },
    });

    expect(renderedOptions(fixture)).toEqual([]);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('passes nothing when the field declares no options at all', () => {
    const fixture = mount({
      fieldDescription: { name: 'city', type: 'select' },
    });

    expect(renderedOptions(fixture)).toEqual([]);
  });
});

describe('BaseInputComponent', () => {
  class TestInput extends BaseInputComponent {}

  it('marks for check on input changes', () => {
    const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
    const input = new TestInput(cdr);

    input.ngOnChanges({});

    expect(cdr.markForCheck).toHaveBeenCalledTimes(1);
  });
});
