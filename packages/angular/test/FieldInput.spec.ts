import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseInputComponent } from '../src/components/BaseInput';
import { FieldInput } from '../src/components/FieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

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

  it('renders nothing without a fieldDescription', () => {
    const fixture = TestBed.createComponent(FieldInput);
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
