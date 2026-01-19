import { FieldDescription, Properties } from "@dynamic-field-kit/core"
import { Fragment, useEffect, useMemo, useState } from "react"
import FieldInput from "./FieldInput"

type Layout = "row" | "column" | "grid"

interface Props {
  fieldDescriptions: FieldDescription[]
  properties?: Properties
  onChange?: (data: Properties) => void
  layout?: Layout
}

const MultiFieldInput = ({
  fieldDescriptions,
  properties,
  onChange,
  layout = "column",
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

  const containerStyle: React.CSSProperties = {
    display: layout === "grid" ? "grid" : "flex",
    flexDirection: layout === "row" ? "row" : "column",
    gap: 12,
    ...(layout === "grid" && {
      gridTemplateColumns: "repeat(2, 1fr)",
    }),
  }

  return (
    <div style={containerStyle}>
      {visibleFields.map((f) => (
        <FieldInput
          key={f.name}
          fieldDescription={f}
          renderInfos={data}
          onValueChangeField={(value, key) => {
            const next = { ...data, [key]: value }
            setData(next)
            onChange?.(next)
          }}
        />
      ))}
    </div>
  )
}

export default MultiFieldInput
