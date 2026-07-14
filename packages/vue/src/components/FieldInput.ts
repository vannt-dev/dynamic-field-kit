import {
  resolveDisabled,
  resolveReadOnly,
  validateField,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import { defineComponent, h, PropType } from 'vue';
import DynamicInput from './DynamicInput';

const FieldInput = defineComponent({
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
    onValueChangeField: {
      type: Function as PropType<(value: unknown, key: string) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const {
        name,
        type,
        label,
        options,
        className,
        description,
        props: extraProps,
      } = props.fieldDescription;

      const disabled = resolveDisabled(
        props.fieldDescription,
        props.renderInfos,
        props.rootData
      );
      const readOnly = resolveReadOnly(
        props.fieldDescription,
        props.renderInfos,
        props.rootData
      );
      const errors = disabled
        ? []
        : validateField(
            props.fieldDescription,
            props.renderInfos[name],
            props.renderInfos,
            props.rootData
          );

      return h(DynamicInput, {
        type,
        label,
        value: props.renderInfos[name],
        options,
        className,
        description,
        disabled,
        readOnly,
        error: errors.length > 0 ? errors : undefined,
        extraProps,
        onChange: (v: unknown) => props.onValueChangeField(v, name),
      });
    };
  },
});

export default FieldInput;
