<script setup lang="ts">
import {
  createFormDraft,
  createFormHistory,
  fieldsFromJsonSchema,
} from '@dynamic-field-kit/core';
import { MultiFieldInput, useDynamicForm } from '@dynamic-field-kit/vue';
import { onBeforeUnmount, ref, watch } from 'vue';
import '../lib/fieldRegistry';

// The kind of schema an API already publishes, e.g. an OpenAPI
// `components.schemas` entry. The form below is built from it.
const schema = {
  type: 'object',
  required: ['fullName', 'email'],
  properties: {
    fullName: { type: 'string', title: 'Họ và tên', minLength: 2 },
    email: { type: 'string', format: 'email', title: 'Email' },
    age: { type: 'integer', title: 'Tuổi', minimum: 18, maximum: 100 },
    plan: {
      title: 'Gói dịch vụ',
      enum: ['free', 'pro', 'team'],
      default: 'free',
    },
    newsletter: { type: 'boolean', title: 'Nhận bản tin', default: true },
    // Nested objects are not turned into fields; this one shows up in
    // `warnings` instead of being dropped silently.
    address: { type: 'object', properties: { city: { type: 'string' } } },
  },
};

// `overrides` is merged over the generated fields - here, two placeholders.
const { fields, defaults, warnings } = fieldsFromJsonSchema(schema, {
  overrides: {
    fullName: { placeholder: 'Nguyễn Văn A' },
    email: { placeholder: 'example@domain.com' },
  },
});

const draft = createFormDraft({
  key: 'dfk-demo-schema-form-vue',
  version: 1,
  maxAgeMs: 24 * 60 * 60 * 1000,
});

// A saved draft becomes the starting point; `savedAt` feeds the notice.
const saved = draft.load();
const restoredAt = ref(saved ? draft.savedAt() : undefined);

const form = useDynamicForm({
  fields,
  initialValues: saved ?? defaults,
  validateOnBlur: true,
});

const history = createFormHistory(form.data.value);
const canUndo = ref(false);
const canRedo = ref(false);

watch(
  () => form.data.value,
  (data) => {
    // Nothing is written until the form differs from where it started.
    if (form.isDirty.value) draft.save(data);
    history.push(data);
    canUndo.value = history.canUndo();
    canRedo.value = history.canRedo();
  },
  { deep: true },
);

onBeforeUnmount(() => draft.flush());

function step(data: Record<string, unknown> | undefined) {
  if (data) form.handleChange(data);
}

function startOver() {
  draft.clear();
  form.reset(defaults);
  history.reset(defaults);
  canUndo.value = false;
  canRedo.value = false;
  restoredAt.value = undefined;
}

const onSubmit = form.handleSubmit((data) => {
  draft.clear();
  alert(`Submit thành công:\n${JSON.stringify(data, null, 2)}`);
});
</script>

<template>
  <div>
    <p v-if="restoredAt !== undefined" class="demo-notice">
      Đã khôi phục bản nháp lưu lúc
      {{ new Date(restoredAt).toLocaleTimeString() }}.
    </p>

    <form @submit="onSubmit">
      <MultiFieldInput
        :field-descriptions="fields"
        :form="form"
        :layout="{
          type: 'responsive',
          mobile: 'column',
          desktop: { type: 'grid', columns: 2, gap: 16 },
        }"
      />

      <div class="demo-actions">
        <button
          type="button"
          class="btn"
          :disabled="!canUndo"
          @click="step(history.undo())"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          class="btn"
          :disabled="!canRedo"
          @click="step(history.redo())"
        >
          ↷ Redo
        </button>
        <button type="button" class="btn" @click="startOver">
          Xoá bản nháp
        </button>
        <button type="submit" class="btn btn--primary">Submit Form</button>
      </div>
    </form>

    <p class="demo-note">
      Nhập vài ô rồi tải lại trang: dữ liệu vẫn còn (lưu trong
      <code>localStorage</code>). Undo gom các lần gõ liên tiếp vào cùng một ô
      thành một bước.
    </p>

    <div v-if="warnings.length > 0" class="demo-panel demo-panel--warn">
      <h3><code>warnings</code> — phần schema không thành field</h3>
      <pre>{{ JSON.stringify(warnings, null, 2) }}</pre>
    </div>
  </div>
</template>
