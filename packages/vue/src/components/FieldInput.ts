import {
  buildFieldRendererProps,
  makeFieldId,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import { defineComponent, h, PropType } from 'vue';
import DynamicInput from './DynamicInput';

const FieldInput = /* @__PURE__ */ defineComponent({
  name: 'FieldInput',
  props: {
    fieldDescription: {
      type: Object as PropType<FieldDescription>,
      required: true,
    },
    renderInfos: {
      type: Object as PropType<Properties>,
      required: true,
    },
    rootData: {
      type: Object as PropType<Properties>,
      default: undefined,
    },
    /** Per-form-instance id namespace; see core's `makeFieldId`. */
    idPrefix: {
      type: String,
      default: 'dfk-field',
    },
    onValueChangeField: {
      type: Function as PropType<(value: unknown, key: string) => void>,
      required: true,
    },
    onBlurField: {
      type: Function as PropType<(key: string) => void>,
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
  },
  setup(props) {
    return () => {
      const { name } = props.fieldDescription;

      const rendererProps = buildFieldRendererProps({
        fieldDescription: props.fieldDescription,
        data: props.renderInfos,
        rootData: props.rootData,
        id: makeFieldId(props.fieldDescription, props.idPrefix),
        touched: props.touched,
        dirty: props.dirty,
      });

      return h(DynamicInput, {
        ...rendererProps,
        onChange: (v: unknown) => props.onValueChangeField(v, name),
        onBlur: () => props.onBlurField?.(name),
      });
    };
  },
});

export default FieldInput;
