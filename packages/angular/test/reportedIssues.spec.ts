/**
 * Regression tests for the issues reported against 1.5.1. Mirrors
 * packages/react/test/reportedIssues.test.tsx and the Vue equivalent so all
 * three adapters are held to the same behaviour.
 */
import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldDescription } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiFieldInput } from '../src/components/MultiFieldInput';
import { FIELD_REGISTRY } from '../src/fieldRegistryToken';
import { createDynamicFormStore } from '../src/lib/dynamic-form.store';
import { makeRegistry } from './helpers/renderers';

/** Mirrors what an app renderer does: show the error only once touched. */
@Component({
  selector: 'dfk-test-touched',
  standalone: true,
  imports: [NgIf],
  template: `
    <input
      class="txt"
      [id]="id ?? ''"
      [value]="value ?? ''"
      [placeholder]="placeholder ?? ''"
    />
    <span class="err" *ngIf="touched && error">{{ errorText }}</span>
  `,
})
class TouchedAwareRenderer {
  @Input() value?: unknown;
  @Input() id?: string;
  @Input() label?: string;
  @Input() placeholder?: string;
  @Input() required?: boolean;
  @Input() touched?: boolean;
  @Input() dirty?: boolean;
  @Input() error?: string | string[];
  @Input() ariaInvalid?: boolean;
  @Input() ariaRequired?: boolean;
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: number | string;
  @Input() accept?: string;
  @Input() multiple?: boolean;
  @Output() valueChange = new EventEmitter<unknown>();

  get errorText(): string {
    return ([] as string[]).concat(this.error ?? []).join(', ');
  }
}

const fields: FieldDescription[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    validate: (v) => (v ? undefined : 'Required'),
  },
];

function mount(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(MultiFieldInput);
  fixture.componentRef.setInput('fieldDescriptions', fields);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function inputEl(fixture: { nativeElement: HTMLElement }): HTMLInputElement {
  return fixture.nativeElement.querySelector('input.txt') as HTMLInputElement;
}

function errorText(fixture: { nativeElement: HTMLElement }): string | null {
  const el = fixture.nativeElement.querySelector('.err');
  return el ? (el.textContent || '').trim() : null;
}

function blur(fixture: { nativeElement: HTMLElement }) {
  inputEl(fixture).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

describe('reported issues (Angular)', () => {
  beforeEach(() => {
    const registry = makeRegistry();
    registry.register('text', TouchedAwareRenderer as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  describe('issue 1: duplicate field ids across form instances', () => {
    it('gives two forms sharing a field name different ids', () => {
      const a = mount();
      const b = mount();

      expect(inputEl(a).id).toBeTruthy();
      expect(inputEl(a).id).not.toBe(inputEl(b).id);
    });

    it('produces ids usable as CSS selectors', () => {
      const fixture = mount();
      expect(inputEl(fixture).id).toMatch(/^[A-Za-z][\w-]*$/);
    });

    it('honours an explicit idPrefix', () => {
      const fixture = mount({ idPrefix: 'dfk-field' });
      expect(inputEl(fixture).id).toBe('dfk-field-username');
    });

    it('lets a field pin its own id', () => {
      const fixture = TestBed.createComponent(MultiFieldInput);
      fixture.componentRef.setInput('fieldDescriptions', [
        { ...fields[0], id: 'login-username' },
      ]);
      fixture.detectChanges();

      expect(inputEl(fixture).id).toBe('login-username');
    });
  });

  describe('issue 2/3: touched reaches the renderer and is controllable', () => {
    it('passes touched down so the error only shows after blur', () => {
      const fixture = mount();
      expect(errorText(fixture)).toBeNull();

      blur(fixture);
      fixture.detectChanges();

      expect(errorText(fixture)).toBe('Required');
    });

    it('honours a controlled touched map from the form store', () => {
      const store = createDynamicFormStore({
        fields,
        initialValues: { username: '' },
      });
      const fixture = mount({
        properties: store.data(),
        touched: store.touched(),
        errors: store.errors(),
      });
      expect(errorText(fixture)).toBeNull();

      // What handleSubmit does on an invalid submit.
      store.touchAll();
      fixture.componentRef.setInput('touched', store.touched());
      fixture.detectChanges();

      // Controlled errors remain lazy until the store validates.
      expect(errorText(fixture)).toBeNull();

      store.validate();
      fixture.componentRef.setInput('errors', store.errors());
      fixture.detectChanges();

      expect(errorText(fixture)).toBe('Required');

      store.reset();
      fixture.componentRef.setInput('touched', store.touched());
      fixture.componentRef.setInput('errors', store.errors());
      fixture.detectChanges();

      expect(errorText(fixture)).toBeNull();
    });

    it('exposes resetTouched for the uncontrolled mode', () => {
      const fixture = mount();
      blur(fixture);
      fixture.detectChanges();
      expect(errorText(fixture)).toBe('Required');

      fixture.componentInstance.resetTouched();
      fixture.detectChanges();

      expect(errorText(fixture)).toBeNull();
    });

    it('emits touchedChange when a field is blurred', () => {
      const fixture = mount();
      const seen: Record<string, boolean>[] = [];
      fixture.componentInstance.touchedChange.subscribe(
        (t: Record<string, boolean>) => seen.push(t),
      );

      blur(fixture);

      expect(seen).toEqual([{ username: true }]);
    });
  });

  describe('store: touchAll and resetTouched', () => {
    it('touchAll marks every field touched', () => {
      const store = createDynamicFormStore({ fields });
      expect(store.touched()).toEqual({});
      store.touchAll();
      expect(store.touched()).toEqual({ username: true });
    });

    it('handleSubmit touches everything on an invalid submit', async () => {
      const store = createDynamicFormStore({
        fields,
        initialValues: { username: '' },
      });
      await store.handleSubmit(() => {})();
      expect(store.touched()).toEqual({ username: true });
    });
  });

  describe('issue 4/5: the full renderer prop set reaches the renderer', () => {
    it('forwards placeholder, required, dirty and the numeric/file props', () => {
      const fixture = TestBed.createComponent(MultiFieldInput);
      fixture.componentRef.setInput('fieldDescriptions', [
        {
          name: 'username',
          type: 'text',
          label: 'Username',
          placeholder: 'Type your name',
          required: true,
          min: 1,
          max: 9,
          step: 2,
          accept: '.png',
          multiple: true,
        },
      ] as FieldDescription[]);
      fixture.detectChanges();

      const renderer = fixture.debugElement.query(
        (n) => n.componentInstance instanceof TouchedAwareRenderer,
      ).componentInstance as TouchedAwareRenderer;

      expect(renderer.placeholder).toBe('Type your name');
      expect(renderer.label).toBe('Username');
      expect(renderer.required).toBe(true);
      expect(renderer.min).toBe(1);
      expect(renderer.max).toBe(9);
      expect(renderer.step).toBe(2);
      expect(renderer.accept).toBe('.png');
      expect(renderer.multiple).toBe(true);
      expect(renderer.ariaRequired).toBe(true);
      expect(renderer.id).toBeTruthy();
      expect(renderer.dirty).toBe(false);
    });
  });
});

describe('issue 1, worst case: repeatable groups (Angular)', () => {
  beforeEach(() => {
    const registry = makeRegistry();
    registry.register('text', TouchedAwareRenderer as never);
    TestBed.configureTestingModule({
      imports: [MultiFieldInput],
      providers: [{ provide: FIELD_REGISTRY, useValue: registry }],
    });
  });

  it('gives every group item its own id for the same field name', () => {
    const fixture = TestBed.createComponent(MultiFieldInput);
    fixture.componentRef.setInput('fieldDescriptions', [
      {
        name: 'contacts',
        type: 'text',
        label: 'Contacts',
        fields: [{ name: 'email', type: 'text', label: 'Email' }],
      },
    ] as FieldDescription[]);
    fixture.componentRef.setInput('properties', {
      contacts: [{ email: 'a' }, { email: 'b' }, {}],
    });
    fixture.detectChanges();

    const ids = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('input.txt'),
    ).map((i) => (i as HTMLInputElement).id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
