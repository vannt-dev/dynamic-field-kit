import DynamicInput from "./DynamicInput"
import { FieldDescription, Properties } from "@dynamic-field-kit/core"

interface Props<TData extends Properties = Properties> {
  field: FieldDescription<any, TData>
  data?: TData
  onChange?: (value: any, key: string) => void
}

const FieldInput = <TData extends Properties>({
  field,
  data,
  onChange
}: Props<TData>) => {
  const key = field.name
  const value = data?.[key] ?? field.defaultValue

  return (
    <DynamicInput
      type={field.type}
      value={value}
      onValueChange={(v: any) => onChange?.(v, key)}
    />
  )
}

export default FieldInput
