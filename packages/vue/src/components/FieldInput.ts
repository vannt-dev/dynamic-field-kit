import { FieldDescription, Properties } from '@dynamic-field-kit/core';
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
    onValueChangeField: {
      type: Function as PropType<(value: unknown, key: string) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const { name, type, label, options, className, description } =
        props.fieldDescription;

      return h(DynamicInput, {
        type,
        label,
        value: props.renderInfos[name],
        options,
        className,
        description,
        onChange: (v: any) => props.onValueChangeField(v, name),
      } as any);
    };
  },
});

export default FieldInput;
