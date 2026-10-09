<script lang="ts">
  import type { FieldDescription, Properties } from '@dynamic-field-kit/core';
  import { createDynamicForm } from '../../src/createDynamicForm.svelte.js';
  import MultiFieldInput from '../../src/components/MultiFieldInput.svelte';

  // What an application writes: a form created in a component, handed to
  // MultiFieldInput through the `form` shorthand, with its state shown.
  let {
    fields,
    initialValues,
    validateOnChange = false,
    onSubmitted,
  }: {
    fields: FieldDescription[];
    initialValues?: Properties;
    validateOnChange?: boolean;
    onSubmitted?: (data: Properties) => void;
  } = $props();

  // A form is created once, from the values it starts with.
  const form = createDynamicForm({ fields, initialValues, validateOnChange });

  /** The form, for a test to drive from outside. */
  export function getForm() {
    return form;
  }
</script>

<form onsubmit={form.handleSubmit((data) => onSubmitted?.(data))}>
  <MultiFieldInput fieldDescriptions={fields} {form} idPrefix="f" />
  <output data-testid="data">{JSON.stringify(form.data)}</output>
  <output data-testid="dirty">{String(form.isDirty)}</output>
  <output data-testid="valid">{String(form.isValid)}</output>
  <output data-testid="submitted">{String(form.isSubmitted)}</output>
  <button type="submit">Save</button>
</form>
