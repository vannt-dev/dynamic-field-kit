import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DynamicInput from '../src/components/DynamicInput';
import { defaultRenderersMap } from '../src/defaultRenderers';
import { FieldRegistryKey } from '../src/fieldRegistryContext';

// What a form hands every renderer about its field. None of it is an
// attribute of an HTML control.
const ABOUT_THE_FIELD = {
  label: 'Name',
  description: 'As on your passport',
  error: ['Field is required'],
  touched: true,
  dirty: false,
  options: [{ value: 'a', label: 'A' }],
  optionsStatus: 'ready',
  optionsError: new Error('offline'),
  onOptionsQuery: () => undefined,
};
const NOT_ATTRIBUTES = [
  'label',
  'description',
  'error',
  'touched',
  'dirty',
  'options',
  'optionsstatus',
  'optionserror',
];

function attributesOf(type: string, props: Record<string, unknown> = {}) {
  const container = document.createElement('div');
  const wrapper = mount(DynamicInput, {
    props: { type, id: 'f', value: undefined, ...ABOUT_THE_FIELD, ...props },
    global: { provide: { [FieldRegistryKey]: new FieldRegistry() } },
    attachTo: container,
  });
  // the control, and for the renderers made of several elements, every one
  const elements = [...container.querySelectorAll('*')].filter(
    (element) => !element.classList.contains('dfk-field-error'),
  );
  return {
    wrapper,
    names: new Set(
      elements.flatMap((element) =>
        element.getAttributeNames().map((name) => name.toLowerCase()),
      ),
    ),
  };
}

describe('the built-in renderers', () => {
  it.each(Object.keys(defaultRenderersMap))(
    '%s: puts nothing about the field on the element as an attribute',
    (type) => {
      const { names } = attributesOf(type);
      expect(NOT_ATTRIBUTES.filter((name) => names.has(name))).toEqual([]);
    },
  );

  it('still hand on what is an attribute of the control', () => {
    const text = attributesOf('text', {
      extraProps: { maxlength: 5, 'data-step': 'one' },
    });
    expect(text.wrapper.find('input').attributes('maxlength')).toBe('5');
    expect(text.wrapper.find('input').attributes('data-step')).toBe('one');

    const date = attributesOf('date', { min: '2026-01-01', max: '2026-12-31' });
    expect(date.wrapper.find('input').attributes('min')).toBe('2026-01-01');
    expect(date.wrapper.find('input').attributes('max')).toBe('2026-12-31');

    const number = attributesOf('number', { min: 1, max: 9, step: 2 });
    expect(number.wrapper.find('input').attributes()).toMatchObject({
      min: '1',
      max: '9',
      step: '2',
    });
  });

  it('keep rendering the options they are given', () => {
    const select = attributesOf('select', { value: 'a' });
    expect(
      select.wrapper.findAll('option').map((option) => option.text()),
    ).toContain('A');
  });
});
