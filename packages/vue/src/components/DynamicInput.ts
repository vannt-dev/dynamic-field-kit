/* eslint-disable import/order */
import { defineComponent, computed, h, PropType } from 'vue';
import { FieldTypeKey, Properties } from '@dynamic-field-kit/core';
import { getDefaultRenderer } from '../defaultRenderers';
import { useFieldRegistry } from '../fieldRegistryContext';

const DynamicInput = /* @__PURE__ */ defineComponent({
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
    onBlur: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    touched: {
      type: Boolean,
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
    const Renderer = computed(
      () => registry.get(props.type) || getDefaultRenderer(props.type),
    );

    return () => {
      if (!Renderer.value) {
        return h('div', `Unknown field type: ${props.type}`);
      }

      return h(Renderer.value, {
        ...props.extraProps,
        value: props.value,
        'onUpdate:value': props.onChange,
        onBlur: props.onBlur,
        touched: props.touched,
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
