import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldDescription } from '@dynamic-field-kit/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { DynamicFormDevToolsComponent } from '../src/components/DynamicFormDevTools';

function text(fixture: ComponentFixture<DynamicFormDevToolsComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent || '';
}

function buttons(
  fixture: ComponentFixture<DynamicFormDevToolsComponent>
): HTMLButtonElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll('button')
  );
}

function open(fixture: ComponentFixture<DynamicFormDevToolsComponent>) {
  buttons(fixture)[0].click();
  fixture.detectChanges();
}

function clickTab(
  fixture: ComponentFixture<DynamicFormDevToolsComponent>,
  label: string
) {
  const tab = buttons(fixture).find((b) =>
    (b.textContent || '').trim().toLowerCase().startsWith(label)
  );
  tab?.click();
  fixture.detectChanges();
}

describe('DynamicFormDevToolsComponent', () => {
  let fixture: ComponentFixture<DynamicFormDevToolsComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DynamicFormDevToolsComponent);
    fixture.detectChanges();
  });

  it('renders collapsed by default', () => {
    expect(text(fixture)).toContain('🔍 DevTools');
    expect(text(fixture)).not.toContain('🛠️ Form DevTools');
  });

  it('opens the overlay', () => {
    open(fixture);

    expect(text(fixture)).toContain('🛠️ Form DevTools');
  });

  it('shows form data on the data tab', () => {
    fixture.componentInstance.data = { email: 'a@b.com' };
    open(fixture);

    expect(text(fixture)).toContain('a@b.com');
  });

  it('shows errors on the errors tab', () => {
    fixture.componentInstance.errors = { email: ['Invalid email'] };
    open(fixture);
    clickTab(fixture, 'errors');

    expect(text(fixture)).toContain('Invalid email');
  });

  it('shows dirty and touched state on the meta tab', () => {
    fixture.componentInstance.isDirty = true;
    fixture.componentInstance.touched = { email: true };
    open(fixture);
    clickTab(fixture, 'meta');

    expect(text(fixture)).toContain('isDirty: true');
    expect(text(fixture)).toContain('email');
  });

  it('lists field descriptions on the fields tab', () => {
    const fields: FieldDescription[] = [{ name: 'email', type: 'text' }];
    fixture.componentInstance.fields = fields;
    open(fixture);
    clickTab(fixture, 'fields');

    expect(text(fixture)).toContain('email');
    expect(text(fixture)).toContain('type: text');
  });

  it('closes the overlay again', () => {
    open(fixture);

    const close = buttons(fixture).find(
      (b) => (b.textContent || '').trim() === '✕'
    );
    close?.click();
    fixture.detectChanges();

    expect(text(fixture)).not.toContain('🛠️ Form DevTools');
    expect(text(fixture)).toContain('🔍 DevTools');
  });
});
