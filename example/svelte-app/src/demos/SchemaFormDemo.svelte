<script lang="ts">
  import {
    createFormDraft,
    createFormHistory,
    fieldsFromJsonSchema,
  } from '@dynamic-field-kit/core';
  import { MultiFieldInput, createDynamicForm } from '@dynamic-field-kit/svelte';
  import { onDestroy, untrack } from 'svelte';
  import '../lib/fieldRegistry';
  import { t } from '../../../shared/i18n';

  // The kind of schema an API already publishes, e.g. an OpenAPI
  // `components.schemas` entry. The form below is built from it.
  const schema = {
    type: 'object',
    required: ['fullName', 'email'],
    properties: {
      fullName: { type: 'string', title: t('Full name'), minLength: 2 },
      email: { type: 'string', format: 'email', title: t('Email') },
      age: { type: 'integer', title: t('Age'), minimum: 18, maximum: 100 },
      plan: {
        title: t('Plan'),
        enum: ['free', 'pro', 'team'],
        default: 'free',
      },
      newsletter: {
        type: 'boolean',
        title: t('Send me the newsletter'),
        default: true,
      },
      // Nested objects are not turned into fields; this one shows up in
      // `warnings` instead of being dropped silently.
      address: { type: 'object', properties: { city: { type: 'string' } } },
    },
  };

  // `overrides` is merged over the generated fields - here, two placeholders.
  const { fields, defaults, warnings } = fieldsFromJsonSchema(schema, {
    overrides: {
      fullName: { placeholder: t('Jane Doe') },
      email: { placeholder: 'example@domain.com' },
    },
  });

  const draft = createFormDraft({
    key: 'dfk-demo-schema-form-svelte',
    version: 1,
    maxAgeMs: 24 * 60 * 60 * 1000,
  });

  // A saved draft becomes the starting point; `savedAt` feeds the notice.
  const saved = draft.load();
  let restoredAt = $state(saved ? draft.savedAt() : undefined);

  const form = createDynamicForm({
    fields,
    initialValues: saved ?? defaults,
    validateOnBlur: true,
  });

  const history = createFormHistory(form.data);
  let canUndo = $state(false);
  let canRedo = $state(false);

  // Runs whenever the form's data is replaced. Only `form.data` is tracked:
  // what the body reads besides it must not make it run again.
  $effect(() => {
    const data = form.data;
    untrack(() => {
      // Nothing is written until the form differs from where it started.
      if (form.isDirty) draft.save(data);
      history.push(data);
      canUndo = history.canUndo();
      canRedo = history.canRedo();
    });
  });

  onDestroy(() => draft.flush());

  function step(data: Record<string, unknown> | undefined) {
    if (data) form.handleChange(data);
  }

  function startOver() {
    draft.clear();
    form.reset(defaults);
    history.reset(defaults);
    canUndo = false;
    canRedo = false;
    restoredAt = undefined;
  }

  const onSubmit = form.handleSubmit((data) => {
    draft.clear();
    alert(`${t('Submitted:')}\n${JSON.stringify(data, null, 2)}`);
  });
</script>

<div>
  {#if restoredAt !== undefined}
    <p class="demo-notice">
      {t('Draft restored, saved at')}
      {new Date(restoredAt).toLocaleTimeString()}.
    </p>
  {/if}

  <form onsubmit={onSubmit}>
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
      <button
        type="button"
        class="btn"
        disabled={!canUndo}
        onclick={() => step(history.undo())}
      >
        ↶ Undo
      </button>
      <button
        type="button"
        class="btn"
        disabled={!canRedo}
        onclick={() => step(history.redo())}
      >
        ↷ Redo
      </button>
      <button type="button" class="btn" onclick={startOver}>
        {t('Clear draft')}
      </button>
      <button type="submit" class="btn btn--primary">
        {t('Submit Form')}
      </button>
    </div>
  </form>

  <p class="demo-note">
    {t(
      'Type in a few fields and reload the page: the data is still there (kept in localStorage). Undo groups consecutive typing in one field into a single step.',
    )}
  </p>

  {#if warnings.length > 0}
    <div class="demo-panel demo-panel--warn">
      <h3>
        {t('warnings: the parts of the schema that did not become fields')}
      </h3>
      <pre>{JSON.stringify(warnings, null, 2)}</pre>
    </div>
  {/if}
</div>
