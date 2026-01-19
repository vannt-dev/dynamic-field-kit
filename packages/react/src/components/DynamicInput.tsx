import { fieldRegistry, FieldTypeKey, Properties } from "@dynamic-field-kit/core"
import { ReactNode } from "react"

interface Props<T extends FieldTypeKey> {
    type: T
    value?: any
    onChange?: (value: any) => void
    label?: string
    options?: Properties[]
    className?: string
    description?: ReactNode
}


const DynamicInput = <T extends FieldTypeKey>({ type, value, onChange, label, options, className, description }: Props<T>) => {
    const Renderer = fieldRegistry.get(type)


    if (!Renderer) return <div>Unknown field type: {type}</div>


    return <Renderer value={value} onValueChange={onChange} label={label} options={options} className={className} description={description} />
}


export default DynamicInput