# @dynamic-field-kit/vue

Vue 3 renderer for dynamic-field-kit

## Installation

```
bash
npm install @dynamic-field-kit/vue vue @dynamic-field-kit/core
```

## Usage

```
vue
<script setup lang="ts">
import { ref } from 'vue'
import { MultiFieldInput, fieldRegistry } from '@dynamic-field-kit/vue'

const fields = ref([
  { name: 'username', type: 'text', label: 'Username' },
  { name: 'email', type: 'email', label: 'Email' }
])

const formData = ref({})

function handleChange(data: any) {
  formData.value = data
}
</script>

<template>
  <MultiFieldInput
    :fieldDescriptions="fields"
    :properties="formData"
    :onChange="handleChange"
  />
</template>
