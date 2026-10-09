<script lang="ts">
  import type { Snippet } from 'svelte';

  // What every renderer of this app has around its control: the label above
  // and, once the field has been visited, its error below.
  let {
    label,
    touched,
    error,
    group = false,
    children,
  }: {
    label?: string;
    touched?: boolean;
    error?: string | string[];
    /** A set of controls (radio buttons) rather than one: a fieldset, not a label. */
    group?: boolean;
    children: Snippet;
  } = $props();

  // An error is shown once the field has been visited, not while it is pristine.
  const shown = $derived(
    !touched || !error
      ? undefined
      : Array.isArray(error)
        ? error.join(', ')
        : error,
  );
</script>

{#if group}
  <fieldset class={['field', shown && 'field--invalid']}>
    {#if label}<legend class="field__label">{label}</legend>{/if}
    {@render children()}
    {#if shown}<span class="field__error">{shown}</span>{/if}
  </fieldset>
{:else}
  <label class={['field', shown && 'field--invalid']}>
    {#if label}<span class="field__label">{label}</span>{/if}
    {@render children()}
    {#if shown}<span class="field__error">{shown}</span>{/if}
  </label>
{/if}
