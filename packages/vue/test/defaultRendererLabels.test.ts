import type { FieldDescription } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
import '../src/layout/defaultLayouts';

// The registry's field types are open-ended; these tests use plain strings.
const list = (fields: unknown[]) => fields as FieldDescription[];

const options = [
  { label: 'Vietnam', value: 'VN' },
  { label: 'United States', value: 'US' },
];

// Every built-in type except radio, which is a group rather than one control.
const single = [
  'text',
  'number',
  'password',
  'email',
  'textarea',
  'checkbox',
  'select',
  'range',
  'file',
  'date',
  'time',
  'datetime-local',
  'switch',
];

function mountFields(
  fields: FieldDescription[],
  errors?: Record<string, string[]>,
  registry = new FieldRegistry(),
) {
  return mount(MultiFieldInput, {
    props: { fieldDescriptions: fields, properties: {}, idPrefix: 'f', errors },
    global: { provide: { [FieldRegistryKey]: registry } },
    attachTo: document.body,
  });
}

/** The control a label names, the way assistive technology finds it. */
function byLabelText(text: string): HTMLElement {
  const label = [...document.querySelectorAll('label')].find(
    (element) => element.textContent?.trim() === text,
  );
  const control = label?.htmlFor
    ? document.getElementById(label.htmlFor)
    : label?.querySelector('input');
  if (!control) {
    throw new Error(`no control labelled "${text}"`);
  }
  expect(
    [...((control as HTMLInputElement).labels ?? [])].includes(label!),
  ).toBe(true);
  return control;
}

describe('built-in renderers', () => {
  it.each(single)('label a %s control with <label for>', (type) => {
    const wrapper = mountFields(
      list([{ name: 'x', type, label: `The ${type}`, options }]),
    );
    const control = byLabelText(`The ${type}`);
    expect(control.id).toBe('f-x');
    expect(control.tagName).toMatch(/INPUT|SELECT|TEXTAREA/);
    wrapper.unmount();
  });

  it('name a radio group after its caption', () => {
    const wrapper = mountFields(
      list([{ name: 'country', type: 'radio', label: 'Country', options }]),
    );
    const group = wrapper.find('[role="radiogroup"]').element;
    const caption = document.getElementById(
      group.getAttribute('aria-labelledby')!,
    );
    expect(caption?.textContent).toBe('Country');
    expect(group.id).toBe('f-country');
    expect(byLabelText('Vietnam').getAttribute('type')).toBe('radio');
    wrapper.unmount();
  });

  it('keep label, control and message together in one element', () => {
    const wrapper = mountFields(
      list([{ name: 'email', type: 'email', label: 'Email' }]),
      { email: ['Invalid email'] },
    );
    const field = wrapper.find('.dfk-field').element;
    const control = byLabelText('Email');
    expect(field.contains(control)).toBe(true);
    expect(control.getAttribute('aria-invalid')).toBe('true');
    const message = document.getElementById(
      control.getAttribute('aria-describedby')!,
    );
    expect(message?.textContent).toBe('Invalid email');
    expect(field.contains(message)).toBe(true);
    wrapper.unmount();
  });

  it('draw no label for a field without one', () => {
    const wrapper = mountFields(list([{ name: 'x', type: 'text' }]));
    expect(wrapper.find('.dfk-field-label').exists()).toBe(false);
    expect(wrapper.find('.dfk-field input').exists()).toBe(true);
    wrapper.unmount();
  });

  it('leave a registered renderer as it was: no wrapper, no label', () => {
    const registry = new FieldRegistry();
    registry.register(
      'text',
      defineComponent({
        setup: () => () => h('input', { 'data-testid': 'mine' }),
      }) as never,
    );
    const wrapper = mountFields(
      list([{ name: 'x', type: 'text', label: 'X' }]),
      undefined,
      registry,
    );
    expect(wrapper.find('[data-testid="mine"]').exists()).toBe(true);
    expect(wrapper.find('.dfk-field').exists()).toBe(false);
    expect(wrapper.find('label').exists()).toBe(false);
    wrapper.unmount();
  });
});
