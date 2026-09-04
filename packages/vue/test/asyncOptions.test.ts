import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { FieldRegistry } from '@dynamic-field-kit/core';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { FieldRegistryKey } from '../src/fieldRegistryContext';
import '../src/layout/defaultLayouts';

const OptionProbe = defineComponent({
  props: {
    id: String,
    options: Array,
    optionsStatus: String,
    optionsError: null,
    onOptionsQuery: Function,
  },
  setup: (props) => () =>
    h('div', [
      h(
        'span',
        { 'data-testid': `${props.id}-status` },
        props.optionsStatus ?? 'none',
      ),
      h(
        'span',
        { 'data-testid': `${props.id}-options` },
        ((props.options ?? []) as Properties[])
          .map((o) => String(o.value))
          .join(','),
      ),
      h(
        'button',
        {
          'data-testid': `${props.id}-search`,
          onClick: () => (props.onOptionsQuery as (q: string) => void)?.('ada'),
        },
        'search',
      ),
    ]),
});

function mountWith(fields: FieldDescription[], idPrefix: string) {
  const registry = new FieldRegistry();
  registry.register('optionProbe' as never, OptionProbe as never);
  return mount(MultiFieldInput, {
    props: { fieldDescriptions: fields, idPrefix },
    global: { provide: { [FieldRegistryKey]: registry } },
  });
}

describe('async field options', () => {
  it('goes loading then ready and shows the resolved options', async () => {
    const wrapper = mountWith(
      [
        {
          name: 'city',
          type: 'optionProbe' as never,
          options: async () => [{ value: 'hn' }, { value: 'sg' }],
        },
      ],
      'a',
    );

    await flushPromises();

    expect(wrapper.get('[data-testid="a-city-status"]').text()).toBe('ready');
    expect(wrapper.get('[data-testid="a-city-options"]').text()).toBe('hn,sg');
  });

  it('passes the renderer query through to the loader', async () => {
    const load = vi.fn(async (_d: Properties, _r?: Properties, ctx?) => [
      { value: ctx?.query ?? 'none' },
    ]);
    const wrapper = mountWith(
      [
        {
          name: 'user',
          type: 'optionProbe' as never,
          optionsMode: 'async',
          options: load,
        },
      ],
      'b',
    );
    await flushPromises();

    await wrapper.get('[data-testid="b-user-search"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="b-user-options"]').text()).toBe('ada');
  });

  it('reports a failed load', async () => {
    const wrapper = mountWith(
      [
        {
          name: 'city',
          type: 'optionProbe' as never,
          options: async () => {
            throw new Error('network down');
          },
        },
      ],
      'c',
    );

    await flushPromises();

    expect(wrapper.get('[data-testid="c-city-status"]').text()).toBe('error');
  });

  it('leaves a synchronous field with no options status at all', async () => {
    const wrapper = mountWith(
      [
        {
          name: 'city',
          type: 'optionProbe' as never,
          options: [{ value: 'hn' }],
        },
      ],
      'd',
    );
    await flushPromises();

    expect(wrapper.get('[data-testid="d-city-status"]').text()).toBe('none');
    expect(wrapper.get('[data-testid="d-city-options"]').text()).toBe('hn');
  });
});
