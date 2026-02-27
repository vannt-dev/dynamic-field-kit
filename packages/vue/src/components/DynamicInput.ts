import { defineComponent, computed, h } from 'vue'
import { fieldRegistry, FieldTypeKey, Properties } from '@dynamic-field-kit/core'

interface Props {
  type: FieldTypeKey
  value?: any
  onChange?: (value: any) => void
  label?: string
  options?: Properties[]
  className?: string
  description?: any
}

const DynamicInput = defineComponent({
  name: 'DynamicInput',
  props: {
    type: { type: String, required: true },
    value: { type: null, default: undefined },
    onChange: { type: Function, default: undefined },
    label: { type: String, default: undefined },
    options: { type: Array, default: undefined },
    className: { type: String, default: undefined },
    description: { type: null, default: undefined }
  },
  setup(props: Props) {
    const Renderer = computed(() => {
      return (fieldRegistry as any).get(props.type)
    })

    return () => {
      if (!Renderer.value) {
        return h('div', `Unknown field type: ${props.type}`)
      }

      return h(Renderer.value, {
        value: props.value,
        'onUpdate:value': props.onChange,
        label: props.label,
        options: props.options,
        class: props.className,
        description: props.description
      })
    }
  }
})

export default DynamicInput
