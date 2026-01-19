"use client"

import { useState } from "react"
import { MultiFieldInput } from "@dynamic-field-kit/react"
import { FieldDescription } from "@dynamic-field-kit/core"
import "@/lib/fieldRegistry"

const fields: FieldDescription[] = [
  { name: "name", type: "text", label: "Name" },
  { name: "age", type: "number", label: "Age" }
]

export default function Page() {
  const [data, setData] = useState({})

  return (
    <main style={{ padding: 24 }}>
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={data}
        onChange={setData}
      />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  )
}
