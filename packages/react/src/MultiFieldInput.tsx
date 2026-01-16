import { FieldDescription, Properties } from "@dynamic-field-kit/core"
import { Fragment, useEffect, useMemo, useState } from "react"
import FieldInput from "./FieldInput"

interface Props<T = any> {
  fields: FieldDescription<T>[]
  value?: Properties
  onChange?: (data: Properties) => void
}

const MultiFieldInput = <T,>({ fields, value, onChange }: Props<T>) => {
  const [data, setData] = useState<Properties>({})

  useEffect(() => {
    if (value) setData(value)
  }, [value])

  const visibleFields = useMemo(
    () =>
      fields.filter(
        f => !f.appearCondition || f.appearCondition(data)
      ),
    [fields, data]
  )

  const handleChange = (fieldValue: unknown, key: string) => {
    const next = { ...data, [key]: fieldValue }
    setData(next)
    onChange?.(next)
  }

  return (
    <>
      {visibleFields.map(f => (
        <Fragment key={String(f.name)}>
          <FieldInput
            field={f}
            data={data}
            onChange={(v: any, k: any) => {
              const next = { ...data, [k]: v }
              setData(next)
              onChange?.(next)
            }}
          />
        </Fragment>
      ))}
    </>
  )
}

export default MultiFieldInput
