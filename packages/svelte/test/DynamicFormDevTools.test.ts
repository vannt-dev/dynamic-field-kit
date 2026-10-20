import type { FieldDescription } from '@dynamic-field-kit/core';
import { describe, expect, it } from 'vitest';
import { DynamicFormDevTools, createDynamicForm } from '../src';
import type { DynamicFormDevToolsProps } from '../src';
import { act, click, render } from './helpers';

function mount(props: DynamicFormDevToolsProps = {}) {
  return render(DynamicFormDevTools, { data: {}, ...props }).target;
}

const buttons = (target: Element) => [...target.querySelectorAll('button')];

function open(target: Element) {
  click(buttons(target).find((b) => b.textContent?.includes('🔍 DevTools'))!);
}

function clickTab(target: Element, label: string) {
  click(
    buttons(target).find((b) =>
      b.textContent?.trim().toLowerCase().startsWith(label),
    )!,
  );
}

describe('DynamicFormDevTools (Svelte)', () => {
  it('renders collapsed with no error badge when there are no errors', () => {
    const target = mount();

    expect(target.textContent).toContain('🔍 DevTools');
    expect(target.textContent).not.toContain('🛠️ Form DevTools');
    expect(target.querySelectorAll('button span')).toHaveLength(1);
  });

  it('shows the error count on the collapsed badge', () => {
    const target = mount({
      errors: { name: ['required'], email: ['invalid'] },
    });

    expect(target.querySelectorAll('button span')[1]?.textContent).toBe('2');
  });

  it('shows form data on the data tab', () => {
    const target = mount({ data: { email: 'a@b.com' } });
    open(target);

    expect(target.querySelector('pre')?.textContent).toContain('a@b.com');
  });

  it('lists errors on the errors tab', () => {
    const target = mount({
      errors: { email: ['Invalid email', 'Too short'] },
    });
    open(target);
    clickTab(target, 'errors');

    expect(target.textContent).toContain('email:');
    const items = [...target.querySelectorAll('li')].map(
      (li) => li.textContent,
    );
    expect(items).toEqual(['Invalid email', 'Too short']);
  });

  it('reports a clean form on the errors tab', () => {
    const target = mount();
    open(target);
    clickTab(target, 'errors');

    expect(target.textContent).toContain('✓ No validation errors');
  });

  it('shows dirty and touched state on the meta tab', () => {
    const target = mount({ isDirty: true, touched: { email: true } });
    open(target);
    clickTab(target, 'meta');

    expect(target.textContent).toContain('isDirty:');
    expect(target.textContent).toContain('true');
    expect(target.querySelector('pre')?.textContent).toContain('"email": true');
  });

  it('lists field descriptions on the fields tab', () => {
    const fields: FieldDescription[] = [
      { name: 'email', type: 'text', required: true },
    ];
    const target = mount({ fields });
    open(target);
    clickTab(target, 'fields');

    expect(target.textContent).toContain('email');
    expect(target.textContent).toMatch(/type: text \| required: true/);
  });

  it('explains when no field descriptions were passed', () => {
    const target = mount();
    open(target);
    clickTab(target, 'fields');

    expect(target.textContent).toContain('No field descriptions passed');
  });

  it('shows the error count in the errors tab label', () => {
    const target = mount({ errors: { name: ['required'] } });
    open(target);

    expect(
      buttons(target).some((b) => /errors\s*\(1\)/i.test(b.textContent ?? '')),
    ).toBe(true);
  });

  it('closes the overlay again', () => {
    const target = mount();
    open(target);
    expect(target.textContent).toContain('🛠️ Form DevTools');

    click(buttons(target).find((b) => b.textContent?.trim() === '✕')!);

    expect(target.textContent).not.toContain('🛠️ Form DevTools');
    expect(target.textContent).toContain('🔍 DevTools');
  });

  it('anchors to the bottom left when asked', () => {
    const target = mount({ position: 'bottom-left' });

    expect(target.querySelector('button')?.getAttribute('style')).toContain(
      'left: 16px',
    );
  });

  it('reads a form from createDynamicForm, and follows it', () => {
    const fields: FieldDescription[] = [{ name: 'email', type: 'text' }];
    const form = createDynamicForm({
      fields,
      initialValues: { email: '' },
    });
    const target = render(DynamicFormDevTools, { form, fields }).target;
    open(target);
    expect(target.querySelector('pre')?.textContent).toContain('"email": ""');

    act(() => form.setFieldValue('email', 'a@b.com'));
    expect(target.querySelector('pre')?.textContent).toContain('a@b.com');

    clickTab(target, 'meta');
    expect(target.textContent).toContain('isDirty: true');
    form.destroy();
  });

  it('lets a prop passed next to the form win', () => {
    const form = createDynamicForm({
      fields: [],
      initialValues: { from: 'form' },
    });
    const target = render(DynamicFormDevTools, {
      form,
      data: { from: 'prop' },
    }).target;
    open(target);

    expect(target.querySelector('pre')?.textContent).toContain('prop');
    form.destroy();
  });
});
