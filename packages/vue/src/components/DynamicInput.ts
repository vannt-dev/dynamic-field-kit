import { FieldTypeKey, Properties } from '@dynamic-field-kit/core';
import { defineComponent, computed, h, PropType } from 'vue';
import { getDefaultRenderer } from '../defaultRenderers';
import { useFieldRegistry } from '../fieldRegistryContext';

const DynamicInput = /* @__PURE__ */ defineComponent({
  name: 'DynamicInput',

  // Every key of core's FIELD_RENDERER_PROP_KEYS must be declared here, or Vue
  // treats it as a fallthrough attribute instead of a prop and the renderer
  // never sees it as one. This list drifting from the contract is how
  // `placeholder`, `required`, `id`, `dirty` and the aria flags used to go
  // missing on the Vue adapter only.
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
    label: {
      type: String,
      default: undefined,
    },
    placeholder: {
      type: String,
      default: undefined,
    },
    required: {
      type: Boolean,
      default: undefined,
    },
    touched: {
      type: Boolean,
      default: undefined,
    },
    dirty: {
      type: Boolean,
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
    id: {
      type: String,
      default: undefined,
    },
    ariaInvalid: {
      type: Boolean,
      default: undefined,
    },
    ariaDescribedBy: {
      type: String,
      default: undefined,
    },
    ariaRequired: {
      type: Boolean,
      default: undefined,
    },
    min: {
      type: [Number, String] as PropType<number | string>,
      default: undefined,
    },
    max: {
      type: [Number, String] as PropType<number | string>,
      default: undefined,
    },
    step: {
      type: [Number, String] as PropType<number | string>,
      default: undefined,
    },
    accept: {
      type: String,
      default: undefined,
    },
    multiple: {
      type: Boolean,
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
        // Both spellings: `onUpdate:value` is the Vue idiom the bundled
        // renderers use, `onValueChange` is the name core's FieldRendererProps
        // declares, so a renderer ported from React keeps working.
        'onUpdate:value': props.onChange,
        onValueChange: props.onChange,
        onBlur: props.onBlur,
        label: props.label,
        placeholder: props.placeholder,
        required: props.required,
        touched: props.touched,
        dirty: props.dirty,
        error: props.error,
        options: props.options,
        // Vue's name for the contract's `className`, and the one intentional
        // deviation from it. Forwarding `className` as well is not an option:
        // a renderer that does not declare it lets the key fall through to its
        // root element, where Vue's patchDOMProp assigns `el.className` - with
        // an undefined value that becomes `''` and wipes the class the
        // renderer set on itself.
        class: props.className,
        description: props.description,
        disabled: props.disabled,
        readOnly: props.readOnly,
        id: props.id,
        ariaInvalid: props.ariaInvalid,
        ariaDescribedBy: props.ariaDescribedBy,
        ariaRequired: props.ariaRequired,
        min: props.min,
        max: props.max,
        step: props.step,
        accept: props.accept,
        multiple: props.multiple,
      });
    };
  },
});

export default DynamicInput;
