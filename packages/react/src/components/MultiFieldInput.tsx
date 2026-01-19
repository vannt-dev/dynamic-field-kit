import { FieldDescription, Properties } from "@dynamic-field-kit/core"
import { Fragment, useEffect, useMemo, useState } from "react"
import FieldInput from "./FieldInput"
import { layoutRegistry } from "../layout"
import { LayoutConfig } from "../types/layout"


interface Props {
  fieldDescriptions: FieldDescription[]
  properties?: Properties
  onChange?: (data: Properties) => void
  layout?: LayoutConfig
}


function resolveLayout(layout?: LayoutConfig) {
  if (!layout) return { type: "column", config: {} }
  if (typeof layout === "string") return { type: layout, config: {} }
  return { type: layout.type, config: layout }
}


const MultiFieldInput = ({ fieldDescriptions, properties, onChange, layout }: Props) => {
  const [data, setData] = useState<Properties>({})

  useEffect(() => {
    if (properties) setData(properties)
  }, [properties])

  const visibleFields = useMemo(
    () => fieldDescriptions.filter((f) => !f.appearCondition || f.appearCondition(data)),
    [fieldDescriptions, data]
  )

  const { type, config } = resolveLayout(layout)
  
  const Layout = layoutRegistry.get(type)

  if (!Layout) {
    throw new Error(`Unknown layout: ${type}`)
  }

  return (
    <Layout config={config}>
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
    </Layout>
  )
}


export default MultiFieldInput
