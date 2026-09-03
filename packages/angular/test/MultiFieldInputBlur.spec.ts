import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldDescription } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { makeRegistry, TextRendererComponent } from './helpers/renderers';

const fields: FieldDescription[] = [
  { name: 'first', type: 'text', label: 'First' },
  { name: 'second', type: 'text', label: 'Second' },
];

describe('MultiFieldInput blur reporting', () => {
  let fixture: ComponentFixture<MultiFieldInput>;

  beforeEach(() => {
    const registry = makeRegistry();
    registry.register('text', TextRendererComponent as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
    fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', fields);
    fixture.detectChanges();
  });

  function inputs(): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('input'),
    );
  }

  it('reports which field was blurred', () => {
    const seen: string[] = [];
    fixture.componentInstance.onBlurField.subscribe((name: string) =>
      seen.push(name),
    );

    inputs()[1].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();

    expect(seen).toEqual(['second']);
  });

  it('reports each field separately', () => {
    const seen: string[] = [];
    fixture.componentInstance.onBlurField.subscribe((name: string) =>
      seen.push(name),
    );

    inputs()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    inputs()[1].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();

    expect(seen).toEqual(['first', 'second']);
  });

  it('does not throw when nothing is subscribed', () => {
    expect(() => {
      inputs()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('marks the blurred field touched', () => {
    const spy = vi.fn();
    fixture.componentInstance.onBlurField.subscribe(spy);

    inputs()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.isTouched('first')).toBe(true);
    expect(fixture.componentInstance.isTouched('second')).toBe(false);
  });

  it('reports the full path for a field inside a repeatable group', () => {
    const seen: string[] = [];
    fixture.componentInstance.onBlurField.subscribe((name: string) =>
      seen.push(name),
    );
    fixture.componentRef.setInput('fieldDescriptions', [
      {
        name: 'contacts',
        type: 'text',
        fields: [{ name: 'email', type: 'text' }],
      },
    ]);
    fixture.componentRef.setInput('properties', {
      contacts: [{ email: '' }],
    });
    fixture.detectChanges();

    inputs()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();

    expect(seen).toEqual(['contacts[0].email']);
  });
});
