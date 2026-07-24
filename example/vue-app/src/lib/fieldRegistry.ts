import { fieldRegistry as registry } from '@dynamic-field-kit/vue';
import { defineComponent, h } from 'vue';

const inputStyle =
  'padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; display: block; width: 100%; box-sizing: border-box;';

const TextRenderer = defineComponent({
  props: ['value', 'label'],
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('label', { style: 'display: block;' }, [
        props.label ? h('span', props.label) : null,
        h('input', {
          value: props.value ?? '',
          onInput: (e: any) => emit('update:value', e.target.value),
          style: inputStyle,
        }),
      ]);
  },
});

const NumberRenderer = defineComponent({
  props: ['value', 'label'],
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('label', { style: 'display: block;' }, [
        props.label ? h('span', props.label) : null,
        h('input', {
          type: 'number',
          value: props.value ?? '',
          onInput: (e: any) => emit('update:value', Number(e.target.value)),
          style: inputStyle,
        }),
      ]);
  },
});

registry.register('text', TextRenderer);
registry.register('number', NumberRenderer);

export {};
