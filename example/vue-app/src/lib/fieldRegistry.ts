import { fieldRegistry as registry } from '@dynamic-field-kit/vue';
import { defineComponent, h } from 'vue';

const TextRenderer = defineComponent({
  props: ['value'],
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        value: props.value ?? '',
        onInput: (e: any) => emit('update:value', e.target.value),
        style:
          'padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; display: block; width: 100%; box-sizing: border-box;',
      });
  },
});

const NumberRenderer = defineComponent({
  props: ['value'],
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('input', {
        type: 'number',
        value: props.value ?? '',
        onInput: (e: any) => emit('update:value', Number(e.target.value)),
        style:
          'padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; display: block; width: 100%; box-sizing: border-box;',
      });
  },
});

registry.register('text', TextRenderer);
registry.register('number', NumberRenderer);

export {};
