import { defineComponent, h } from 'vue'
import { FieldDescription, Properties } from '@dynamic-field-kit/core'
import DynamicInput from './DynamicInput'

interface Props {
  fieldDescription: FieldDescription
  renderInfos: Properties
  onValueChangeField: (value: any, key: string) => void
}

const FieldInput = defineComponent({
  name: 'FieldInput',
  props: {
    fieldDescription: { type: Object, required: true },
    renderInfos: { type: Object, required: true },
    onValueChangeField: { type: Function, required: true }
  },
  setup(props: Props) {
    return () => {
      const { name, type, label, options, className, description } = props.fieldDescription

      return h(DynamicInput, {
        type,
        label,
        value: props.renderInfos[name],
        options,
        class: className,
        description,
        onChange: (v: any) => props.onValueChangeField(v, name)
      })
    }
  }
})

export default FieldInput
