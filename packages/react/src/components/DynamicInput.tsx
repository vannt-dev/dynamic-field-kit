import { fieldRegistry, FieldTypeKey } from "@dynamic-field-kit/core"

interface Props<T extends FieldTypeKey> {
    type: T
    value?: any
    onChange?: (value: any) => void
    label?: string
}


const DynamicInput = <T extends FieldTypeKey>({ type, value, onChange, label }: Props<T>) => {
    const Renderer = fieldRegistry.get(type)


    if (!Renderer) return <div>Unknown field type: {type}</div>


    return <Renderer value={value} onValueChange={onChange} label={label} />
}


export default DynamicInput