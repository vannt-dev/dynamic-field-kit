<script lang="ts">
  import {
    canGoPrev,
    createWizardState,
    goNext,
    goPrev,
    isStepCompleted,
    validateStep,
    validators,
    type FieldDescription,
    type FormStep,
  } from '@dynamic-field-kit/core';
  import { MultiFieldInput } from '@dynamic-field-kit/svelte';
  import '../lib/fieldRegistry';
  import { t } from '../../../shared/i18n';

  const accountFields: FieldDescription[] = [
    {
      name: 'email',
      type: 'email',
      label: t('Email'),
      validate: validators.compose(
        validators.required(t('Email is required')),
        validators.email(t('Invalid email format')),
      ),
    },
    {
      name: 'password',
      type: 'password',
      label: t('Password'),
      validate: validators.compose(
        validators.required(t('Password is required')),
        validators.minLength(8, t('At least 8 characters')),
      ),
    },
  ];

  const profileFields: FieldDescription[] = [
    {
      name: 'fullName',
      type: 'text',
      label: t('Full name'),
      validate: validators.required(t('Full name is required')),
    },
    { name: 'birthDate', type: 'date', label: t('Date of birth') },
  ];

  const preferenceFields: FieldDescription[] = [
    {
      name: 'plan',
      type: 'radio',
      label: t('Plan'),
      options: [
        { label: t('Free'), value: 'free' },
        { label: 'Pro', value: 'pro' },
      ],
      validate: validators.required(t('Please choose a plan')),
    },
    { name: 'newsletter', type: 'switch', label: t('Send me the newsletter') },
  ];

  const steps: FormStep[] = [
    { id: 'account', title: t('Account'), fields: accountFields },
    { id: 'profile', title: t('Profile'), fields: profileFields },
    { id: 'preferences', title: t('Preferences'), fields: preferenceFields },
  ];

  // Wizard state is immutable: every navigation returns a new state, which is
  // why `$state.raw` (replace, never mutate) is the right kind of state here.
  let wizard = $state.raw(createWizardState(steps));
  let data = $state.raw<Record<string, unknown>>({});
  let errors = $state.raw<Record<string, string[]>>({});
  let touched = $state.raw<Record<string, boolean>>({});
  let submitted = $state(false);

  // goNext does not validate - the wizard decides whether a step may be left.
  function leaveStep(): boolean {
    const result = validateStep(wizard.currentStep, data);
    errors = result.errors;
    // A failed attempt marks the whole step as visited, so every message shows.
    touched = {
      ...touched,
      ...Object.fromEntries(
        wizard.currentStep.fields.map((field) => [field.name, true]),
      ),
    };
    return result.valid;
  }

  function onChange(next: Record<string, unknown>) {
    data = next;
    if (Object.keys(errors).length > 0) {
      errors = validateStep(wizard.currentStep, next).errors;
    }
  }

  function next() {
    if (leaveStep()) wizard = goNext(wizard);
  }

  function prev() {
    errors = {};
    wizard = goPrev(wizard);
  }

  function finish() {
    if (leaveStep()) submitted = true;
  }

  function stepState(index: number) {
    if (!submitted && index === wizard.currentStepIndex) {
      return 'current';
    }
    return submitted || isStepCompleted(wizard, index) ? 'done' : 'todo';
  }
</script>

<div>
  <ol class="demo-steps">
    {#each wizard.steps as step, index (step.id)}
      <li
        class="demo-step demo-step--{stepState(index)}"
        aria-current={stepState(index) === 'current' ? 'step' : undefined}
      >
        {stepState(index) === 'done' ? '✓ ' : `${index + 1}. `}{step.title}
      </li>
    {/each}
  </ol>

  {#if submitted}
    <div class="demo-notice">
      <strong>{t('Done!')}</strong>
      <pre class="demo-panel">{JSON.stringify(data, null, 2)}</pre>
    </div>
  {:else}
    <h2>
      {t('Step')}
      {wizard.currentStepIndex + 1}/{wizard.totalSteps}: {wizard.currentStep
        .title}
    </h2>

    <!-- Only the current step's fields are rendered; a new step is a new form -->
    {#key wizard.currentStep.id}
      <MultiFieldInput
        fieldDescriptions={wizard.currentStep.fields}
        properties={data}
        {onChange}
        {errors}
        {touched}
        onBlurField={(name) => (touched = { ...touched, [name]: true })}
        layout={{
          type: 'responsive',
          mobile: 'column',
          desktop: { type: 'grid', columns: 2, gap: 16 },
        }}
      />
    {/key}

    <div class="demo-actions">
      <button
        type="button"
        class="btn"
        disabled={!canGoPrev(wizard)}
        onclick={prev}
      >
        {t('← Back')}
      </button>
      {#if wizard.isLastStep}
        <button type="button" class="btn btn--primary" onclick={finish}>
          {t('Finish')}
        </button>
      {:else}
        <button type="button" class="btn btn--primary" onclick={next}>
          {t('Next →')}
        </button>
      {/if}
    </div>
  {/if}
</div>
