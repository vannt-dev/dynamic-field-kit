<script lang="ts">
  import { validators } from '@dynamic-field-kit/core';
  import {
    type FieldDescription,
    MultiFieldInput,
    createDynamicForm,
  } from '@dynamic-field-kit/svelte';
  import '../lib/fieldRegistry';
  import { t } from '../../../shared/i18n';

  const fields: FieldDescription[] = [
    {
      name: 'country',
      type: 'select',
      label: t('Country'),
      options: [
        { label: t('Vietnam'), value: 'VN' },
        { label: t('United States'), value: 'US' },
      ],
      validate: validators.required(t('Please choose a country')),
    },
    {
      name: 'gender',
      type: 'radio',
      label: t('Gender'),
      options: [
        { label: t('Male'), value: 'male' },
        { label: t('Female'), value: 'female' },
      ],
    },
    {
      name: 'satisfaction',
      type: 'range',
      label: t('Satisfaction'),
      min: 1,
      max: 10,
      step: 1,
    },
    {
      name: 'email',
      type: 'email',
      label: t('Email'),
      placeholder: 'example@domain.com',
      validate: validators.compose(
        validators.required(t('Email is required')),
        validators.email(t('Invalid email format')),
      ),
    },
    {
      name: 'birthDate',
      type: 'date',
      label: t('Date of birth'),
    },
    {
      name: 'subscribeNewsletter',
      type: 'switch',
      label: t('Send me the newsletter'),
    },
  ];

  // The form owns data, errors, touched and submission state. Its state is
  // read as plain properties - `form.data`, `form.isDirty` - and the markup
  // below updates when they change.
  const form = createDynamicForm({
    fields,
    initialValues: { country: 'VN', satisfaction: 8, subscribeNewsletter: true },
    validateOnBlur: true,
  });

  const onSubmit = form.handleSubmit((data) => {
    alert(`${t('Submitted:')}\n${JSON.stringify(data, null, 2)}`);
  });
</script>

<form onsubmit={onSubmit}>
  <!-- `form` wires the data, change, blur, errors and touched state in one prop -->
  <MultiFieldInput
    fieldDescriptions={fields}
    {form}
    layout={{
      type: 'responsive',
      mobile: 'column',
      desktop: { type: 'grid', columns: 2, gap: 16 },
    }}
  />

  <div class="demo-actions">
    <button type="submit" class="btn btn--primary" disabled={form.isSubmitting}>
      {form.isSubmitting ? t('Submitting…') : t('Submit')}
    </button>
    <button type="button" class="btn" onclick={() => form.reset()}>
      {t('Reset')}
    </button>
  </div>

  <div class="demo-panel">
    <h3>Form state (createDynamicForm)</h3>
    <p class="demo-note" style="margin: 0 0 8px">
      isDirty: {form.isDirty} · isValid: {form.isValid} · isSubmitted:
      {form.isSubmitted} · touched:
      {Object.keys(form.touched).join(', ') || '—'}
    </p>
    <pre>{JSON.stringify(form.data, null, 2)}</pre>
  </div>
</form>
