<script lang="ts">
  import {
    validators,
    validateFields,
    validateFieldsAsync,
  } from '@dynamic-field-kit/core';
  import {
    type FieldDescription,
    MultiFieldInput,
  } from '@dynamic-field-kit/svelte';
  import './lib/fieldRegistry';

  import EnterpriseDemo from './demos/EnterpriseDemo.svelte';
  import WizardDemo from './demos/WizardDemo.svelte';
  import SchemaFormDemo from './demos/SchemaFormDemo.svelte';
  // Vite resolves `?raw` natively, so the panel shows the file that is running.
  import enterpriseSource from './demos/EnterpriseDemo.svelte?raw';
  import wizardSource from './demos/WizardDemo.svelte?raw';
  import schemaSource from './demos/SchemaFormDemo.svelte?raw';
  import { lang, setLang, t } from '../../shared/i18n';

  type Tab = 'legacy' | 'new' | 'enterprise' | 'wizard' | 'schema';

  let activeTab = $state<Tab>('legacy');
  let showCode = $state(false);

  // The landing page only exists on the deployed site, one level above this
  // app's base path, so link to it absolutely.
  const ALL_DEMOS_URL = 'https://vannt-dev.github.io/dynamic-field-kit/';

  const TABS: {
    id: Tab;
    label: string;
    title: string;
    intro: string;
    source?: string;
    sourcePath?: string;
  }[] = [
    {
      id: 'legacy',
      label: t('Basics'),
      title: 'Dynamic Field Kit — Svelte',
      intro: t(
        'Registering renderers with fieldRegistry, MultiFieldInput, layouts, computed fields (computeValue) and repeatable groups.',
      ),
    },
    {
      id: 'new',
      label: 'Validation',
      title: t('Validators, dynamic options and conditions'),
      intro: t(
        'Built-in validators (required, email, compose), options that depend on another field, appearCondition / disabledCondition and async validation.',
      ),
    },
    {
      id: 'enterprise',
      label: 'Form state',
      title: t('Form state with createDynamicForm'),
      intro: t(
        'The form owns data, errors, touched and submit state, read as plain properties that the markup follows.',
      ),
      source: enterpriseSource,
      sourcePath: 'src/demos/EnterpriseDemo.svelte',
    },
    {
      id: 'wizard',
      label: 'Wizard',
      title: 'Multi-Step Wizard',
      intro: t(
        'createWizardState, validateStep, goNext / goPrev. State is immutable: every navigation returns a new state.',
      ),
      source: wizardSource,
      sourcePath: 'src/demos/WizardDemo.svelte',
    },
    {
      id: 'schema',
      label: 'JSON Schema + Undo',
      title: t('JSON Schema, drafts and Undo / Redo'),
      intro: t(
        'fieldsFromJsonSchema builds the form from a JSON Schema, createFormDraft keeps the data across reloads, createFormHistory gives undo / redo.',
      ),
      source: schemaSource,
      sourcePath: 'src/demos/SchemaFormDemo.svelte',
    },
  ];

  const current = $derived(TABS.find((tab) => tab.id === activeTab)!);
  const hasSource = $derived(Boolean(current.source));

  const layout = {
    type: 'responsive',
    mobile: 'column',
    desktop: { type: 'grid', columns: 2, gap: 16 },
  } as const;

  // 1. Basics
  const legacyFields: FieldDescription[] = [
    { name: 'firstName', type: 'text', label: t('First Name') },
    { name: 'lastName', type: 'text', label: t('Last Name') },
    {
      name: 'fullName',
      type: 'text',
      label: t('Full Name (computed)'),
      computeValue: (data) =>
        `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    },
    { name: 'age', type: 'number', label: t('Age') },
    {
      name: 'contacts',
      type: 'group',
      label: t('Contacts'),
      addLabel: t('Add'),
      removeLabel: t('Remove'),
      className: 'demo-group',
      fields: [
        { name: 'email', type: 'text', label: t('Email') },
        { name: 'phone', type: 'text', label: t('Phone') },
      ],
      defaultItem: { email: '', phone: '' },
      minItems: 0,
      maxItems: 5,
    },
  ];

  // Replaced on every change, never mutated: MultiFieldInput tells one set of
  // values from the next by identity.
  let legacyData = $state.raw<Record<string, unknown>>({});

  // 2. Validation
  const newFields: FieldDescription[] = [
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
      name: 'city',
      type: 'select',
      label: t('City'),
      options: (data) => {
        if (data.country === 'VN') {
          return [
            { label: t('Hanoi'), value: 'HN' },
            { label: t('Ho Chi Minh City'), value: 'HCM' },
            { label: t('Da Nang'), value: 'DN' },
          ];
        }
        if (data.country === 'US') {
          return [
            { label: 'New York', value: 'NY' },
            { label: 'Los Angeles', value: 'LA' },
            { label: 'Chicago', value: 'CHI' },
          ];
        }
        return [];
      },
      disabledCondition: (data) => !data.country,
      validate: validators.required(t('Please choose a city')),
    },
    {
      name: 'email',
      type: 'text',
      label: t('Email'),
      placeholder: 'example@domain.com',
      validate: validators.compose(
        validators.required(t('Email is required')),
        validators.email(t('Invalid email format')),
      ),
    },
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      placeholder: t('Enter a username (try "admin")'),
      validate: async (value) => {
        if (!value) return t('Username is required');
        if (String(value).toLowerCase() === 'admin') {
          return t('The name "admin" is taken');
        }
        return undefined;
      },
    },
    {
      name: 'enableExtra',
      type: 'select',
      label: t('Show the extra field?'),
      options: [
        { label: t('No'), value: 'no' },
        { label: t('Yes'), value: 'yes' },
      ],
    },
    {
      name: 'note',
      type: 'text',
      label: t('Extra note (appears when "Yes" is chosen)'),
      appearCondition: (data) => data.enableExtra === 'yes',
    },
    {
      name: 'lockAll',
      type: 'select',
      label: t('Lock the phone number field?'),
      options: [
        { label: t('Unlocked'), value: 'unlocked' },
        { label: t('Locked (disabled)'), value: 'locked' },
      ],
    },
    {
      name: 'phone',
      type: 'text',
      label: t('Phone number'),
      disabledCondition: (data) => data.lockAll === 'locked',
    },
  ];

  let newData = $state.raw<Record<string, unknown>>({ country: 'VN' });
  let errors = $state.raw<Record<string, string[]>>({});
  let newTouched = $state.raw<Record<string, boolean>>({});
  let validating = $state(false);

  function setNewData(updated: Record<string, unknown>) {
    newData = updated;
    errors = validateFields(newFields, updated).errors;
  }

  async function handleValidate() {
    validating = true;
    // Checking the whole form marks every field as visited.
    newTouched = Object.fromEntries(
      newFields.map((field) => [field.name, true]),
    );
    errors = (await validateFieldsAsync(newFields, newData)).errors;
    validating = false;
  }
</script>

<main class={['demo', showCode && hasSource && 'demo--wide']}>
  <nav class="demo-nav" aria-label="Demo pages">
    {#each TABS as tab (tab.id)}
      <button
        type="button"
        class="demo-tab"
        aria-current={activeTab === tab.id ? 'page' : undefined}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
    <span class="demo-lang" role="group" aria-label="Language">
      <button
        type="button"
        aria-pressed={lang === 'en'}
        onclick={() => setLang('en')}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === 'vi'}
        onclick={() => setLang('vi')}
      >
        VI
      </button>
    </span>
    <a href={ALL_DEMOS_URL} class="demo-tab">{t('← All demos')}</a>
  </nav>

  <div class="demo-head">
    <div>
      <h1>{current.title}</h1>
      <p class="demo-intro">{current.intro}</p>
    </div>
    {#if hasSource}
      <button
        type="button"
        class="btn"
        aria-pressed={showCode}
        style="flex-shrink: 0"
        onclick={() => (showCode = !showCode)}
      >
        {showCode ? t('Hide code') : t('View code')}
      </button>
    {/if}
  </div>

  <div class={['demo-split', showCode && hasSource && 'demo-split--code']}>
    <section class="demo-card">
      {#if activeTab === 'legacy'}
        <MultiFieldInput
          fieldDescriptions={legacyFields}
          properties={legacyData}
          onChange={(next) => (legacyData = next)}
          {layout}
        />
        <div class="demo-panel">
          <h3>{t('Form data')}</h3>
          <pre>{JSON.stringify(legacyData, null, 2)}</pre>
        </div>
      {:else if activeTab === 'new'}
        <MultiFieldInput
          fieldDescriptions={newFields}
          properties={newData}
          onChange={setNewData}
          {errors}
          touched={newTouched}
          onBlurField={(name) => (newTouched = { ...newTouched, [name]: true })}
          {layout}
        />
        <div class="demo-actions">
          <button
            type="button"
            class="btn btn--primary"
            disabled={validating}
            onclick={handleValidate}
          >
            {validating ? t('Checking…') : t('Check for errors')}
          </button>
        </div>
        <div class="demo-panel">
          <h3>{t('Form data')}</h3>
          <pre>{JSON.stringify(newData, null, 2)}</pre>
        </div>
        {#if Object.keys(errors).length > 0}
          <div class="demo-panel demo-panel--danger">
            <h3>{t('Validation errors')}</h3>
            <pre>{JSON.stringify(errors, null, 2)}</pre>
          </div>
        {/if}
      {:else if activeTab === 'enterprise'}
        <EnterpriseDemo />
      {:else if activeTab === 'wizard'}
        <WizardDemo />
      {:else}
        <SchemaFormDemo />
      {/if}
    </section>

    {#if showCode && hasSource}
      <aside class="demo-code">
        <div class="demo-code__bar">
          <span>{current.sourcePath}</span>
        </div>
        <pre>{current.source}</pre>
      </aside>
    {/if}
  </div>
</main>
