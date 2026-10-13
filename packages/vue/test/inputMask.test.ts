import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
import { useDynamicForm } from '../src/useDynamicForm';
import '../src/layout/defaultLayouts';

const phone: FieldDescription = {
  name: 'phone',
  type: 'text',
  mask: '(999) 999-9999',
};

// A form that keeps what its fields report, the way a host would.
function mountForm(
  fields: FieldDescription[],
  initial: Properties,
  renderers: Record<string, unknown> = {},
) {
  const registry = new FieldRegistry();
  for (const [type, renderer] of Object.entries(renderers)) {
    registry.register(type as never, renderer as never);
  }
  const data = ref<Properties>(initial);
  const Host = defineComponent({
    setup: () => () =>
      h(MultiFieldInput, {
        fieldDescriptions: fields,
        properties: data.value,
        onChange: (next: Properties) => {
          data.value = next;
        },
      }),
  });
  const wrapper = mount(Host, {
    global: { provide: { [FieldRegistryKey]: registry } },
  });
  const input = () => wrapper.find('input').element as HTMLInputElement;
  return { wrapper, data, input };
}

describe('a field with a mask', () => {
  it('shows the formatted text and stores what was typed', async () => {
    const { wrapper, data, input } = mountForm([phone], { phone: '' });
    expect(input().value).toBe('');

    await wrapper.find('input').setValue('5');
    expect(input().value).toBe('(5');
    await wrapper.find('input').setValue('(5551');
    expect(input().value).toBe('(555) 1');
    expect(data.value).toEqual({ phone: '5551' });
  });

  it('lays out a value the form already holds', () => {
    const { input } = mountForm([phone], { phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');
  });

  it('takes the character before a separator that was deleted', async () => {
    const { wrapper, data, input } = mountForm([phone], {
      phone: '5551234567',
    });
    await wrapper.find('input').setValue('(555 123-4567');
    expect(data.value).toEqual({ phone: '551234567' });
    expect(input().value).toBe('(551) 234-567');
  });

  it('does not leave on screen what the mask refused', async () => {
    const { wrapper, data, input } = mountForm([phone], { phone: '' });

    // A letter where a digit belongs: nothing is stored, nothing is shown.
    await wrapper.find('input').setValue('x');
    expect(data.value).toEqual({ phone: '' });
    expect(input().value).toBe('');

    // One digit more than the pattern has places for.
    await wrapper.find('input').setValue('5551234567');
    expect(input().value).toBe('(555) 123-4567');
    await wrapper.find('input').setValue('(555) 123-45678');
    expect(data.value).toEqual({ phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');
  });

  it('does not leave it on screen when a form store holds the data', async () => {
    const form = useDynamicForm({
      fields: [phone],
      initialValues: { phone: '5551234567' },
    });
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(MultiFieldInput, { fieldDescriptions: [phone], form }),
      }),
      { global: { provide: { [FieldRegistryKey]: new FieldRegistry() } } },
    );
    const input = () => wrapper.find('input').element as HTMLInputElement;
    expect(input().value).toBe('(555) 123-4567');

    await wrapper.find('input').setValue('(555) 123-45678');
    expect(form.data.value).toEqual({ phone: '5551234567' });
    expect(input().value).toBe('(555) 123-4567');

    await wrapper.find('input').setValue('(555) 123-456');
    expect(form.data.value).toEqual({ phone: '555123456' });
  });

  it('does not hand parseInput on to the renderer', () => {
    const seen: Record<string, unknown>[] = [];
    const Spy = defineComponent({
      inheritAttrs: false,
      props: ['value'],
      setup(props, { attrs }) {
        return () => {
          seen.push({ ...attrs, value: props.value });
          return h('input', { value: props.value });
        };
      },
    });
    const { input } = mountForm([phone], { phone: '555' }, { text: Spy });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0].value).toBe('(555');
    expect('parseInput' in seen[0]).toBe(false);
    expect(input().getAttributeNames()).not.toContain('parseinput');
  });

  it('leaves a field without a mask as it was', async () => {
    const { wrapper, data, input } = mountForm(
      [{ name: 'phone', type: 'text' }],
      { phone: '' },
    );
    await wrapper.find('input').setValue('(555) 1');
    expect(data.value).toEqual({ phone: '(555) 1' });
    expect(input().value).toBe('(555) 1');
  });

  it('works for a field inside a repeatable group', async () => {
    const { wrapper, data, input } = mountForm(
      [{ name: 'contacts', type: 'text', fields: [phone] }],
      { contacts: [{ phone: '' }] },
    );
    await wrapper.find('input').setValue('5551234');
    expect(data.value).toEqual({ contacts: [{ phone: '5551234' }] });
    expect(input().value).toBe('(555) 123-4');
  });
});
