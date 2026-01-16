import { FieldDescription, Properties } from "@dynamic-field-kit/core"
import { Fragment, useEffect, useMemo, useState } from "react"
import FieldInput from "./FieldInput"

interface Props {
  fieldDescriptions: FieldDescription[]
  properties?: Properties
  onChange?: (data: Properties) => void
}

const MultiFieldInput = ({
  fieldDescriptions,
  properties,
  onChange,
}: Props) => {
  const [data, setData] = useState<Properties>({})

  useEffect(() => {
    if (properties) setData(properties)
  }, [properties])

  const visibleFields = useMemo(
    () =>
      fieldDescriptions.filter(
        (f) => !f.appearCondition || f.appearCondition(data)
      ),
    [fieldDescriptions, data]
  )

  return (
    <>
      {visibleFields.map((f) => (
        <Fragment key={f.name}>
          <FieldInput
            fieldDescription={f}
            renderInfos={data}
            onValueChangeField={(value, key) => {
              const next = { ...data, [key]: value }
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
