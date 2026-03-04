import { defineComponent, computed, h, PropType } from "vue";
import {
  fieldRegistry,
  FieldTypeKey,
  Properties,
} from "@dynamic-field-kit/core";

const DynamicInput = defineComponent({
  name: "DynamicInput",

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
  },

  setup(props) {
    const Renderer = computed(() => fieldRegistry.get(props.type));

    return () => {
      if (!Renderer.value) {
        return h("div", `Unknown field type: ${props.type}`);
      }

      return h(Renderer.value, {
        value: props.value,
        "onUpdate:value": props.onChange,
        label: props.label,
        options: props.options,
        class: props.className,
        description: props.description,
      });
    };
  },
});

export default DynamicInput;
