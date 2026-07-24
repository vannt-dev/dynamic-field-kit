/* eslint-disable import/order, import/no-unresolved */
import { defineComponent, computed, h, PropType } from 'vue';
import { FieldTypeKey, Properties } from '@dynamic-field-kit/core';
import { useFieldRegistry } from '../fieldRegistryContext';

const DynamicInput = defineComponent({
  name: 'DynamicInput',

  props: {
    type: {
      type: String as unknown as PropType<FieldTypeKey>,
      required: true,
    },
    value: {
      type: null,
      default: undefined,
    },
    onChange: {
      type: Function as PropType<(value: unknown) => void>,
      default: undefined,
    },
    label: {
      type: String,
      default: undefined,
    },
    options: {
      type: Array as PropType<Properties[]>,
      default: undefined,
    },
    className: {
      type: String,
      default: undefined,
    },
    description: {
      type: null,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: undefined,
    },
    readOnly: {
      type: Boolean,
      default: undefined,
    },
    error: {
      type: [String, Array] as PropType<string | string[]>,
      default: undefined,
    },
    // Extra, framework-agnostic props forwarded verbatim to the renderer.
    extraProps: {
      type: Object as PropType<Properties>,
      default: undefined,
    },
  },

  setup(props) {
    const registry = useFieldRegistry();
    const Renderer = computed(() => registry.get(props.type));

    return () => {
      if (!Renderer.value) {
        return h('div', `Unknown field type: ${props.type}`);
      }

      return h(Renderer.value, {
        ...props.extraProps,
        value: props.value,
        'onUpdate:value': props.onChange,
        label: props.label,
        options: props.options,
        class: props.className,
        description: props.description,
        disabled: props.disabled,
        readOnly: props.readOnly,
        error: props.error,
      });
    };
  },
});

export default DynamicInput;
