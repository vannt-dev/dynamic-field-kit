<script setup lang="ts">
import { type FieldDescription, MultiFieldInput } from "@dynamic-field-kit/vue"
import { ref } from "vue"
import "./lib/fieldRegistry"

const fields: FieldDescription[] = [
  { name: "name", type: "text", label: "Name" },
  { name: "age", type: "number", label: "Age" },
]

const data = ref({})

const setData = (newData: any) => {
  data.value = newData
}
</script>

<template>
  <main style="padding: 24px; max-width: 600px; margin: 0 auto; font-family: sans-serif;">
    <h1 style="margin-bottom: 24px;">Dynamic Field Kit Vue Demo</h1>
    <MultiFieldInput
      :fieldDescriptions="fields"
      :properties="data"
      :onChange="setData"
    />
    <div style="margin-top: 24px; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
      <pre style="margin: 0;">{{ JSON.stringify(data, null, 2) }}</pre>
    </div>
  </main>
</template>
