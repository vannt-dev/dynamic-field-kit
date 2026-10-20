<script lang="ts">
  import {
    makeErrorId,
    makeLabelId,
    type FieldTypeKey,
    type OptionsStatus,
    type Properties,
  } from '@dynamic-field-kit/core';
  import type { Component } from 'svelte';
  import { getDefaultRenderer } from '../defaultRenderers.js';
  import { useFieldRegistry } from '../fieldRegistryContext.js';

  // Every key of core's FIELD_RENDERER_PROP_KEYS must be declared here and
  // handed to the renderer below: scripts/check-renderer-prop-parity.js fails
  // the build when either list drifts from the contract.
  interface Props {
    type: FieldTypeKey;
    value?: unknown;
    onChange?: (value: unknown) => void;
    onBlur?: () => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    touched?: boolean;
    dirty?: boolean;
    options?: Properties[];
    optionsStatus?: OptionsStatus;
    optionsError?: unknown;
    className?: string;
    description?: unknown;
    disabled?: boolean;
    readOnly?: boolean;
    error?: string | string[];
    id?: string;
    ariaInvalid?: boolean;
    ariaDescribedBy?: string;
    ariaRequired?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    accept?: string;
    multiple?: boolean;
    /** Renderer-driven refetch for a search-remote field. */
    onOptionsQuery?: (query: string) => void;
    /** Extra, framework-agnostic props forwarded verbatim to the renderer. */
    extraProps?: Properties;
  }

  let {
    type,
    value,
    onChange,
    onBlur,
    label,
    placeholder,
    required,
    touched,
    dirty,
    options,
    optionsStatus,
    optionsError,
    className,
    description,
    disabled,
    readOnly,
    error,
    id,
    ariaInvalid,
    ariaDescribedBy,
    ariaRequired,
    min,
    max,
    step,
    accept,
    multiple,
    onOptionsQuery,
    extraProps,
  }: Props = $props();

  const registry = useFieldRegistry();
  const registered = $derived(
    registry.get(type) as Component<Record<string, unknown>> | undefined,
  );
  const Renderer = $derived(
    registered ??
      (getDefaultRenderer(type) as
        | Component<Record<string, unknown>>
        | undefined),
  );
  // This adapter accepts `error` as a string as well as an array, so index 0
  // of a raw string would be its first character.
  const firstError = $derived(Array.isArray(error) ? error[0] : error);
</script>

{#snippet control(Renderer: Component<Record<string, unknown>>)}
  <Renderer
    {...extraProps}
    value={value}
    onValueChange={onChange}
    onBlur={onBlur}
    onOptionsQuery={onOptionsQuery}
    label={label}
    placeholder={placeholder}
    required={required}
    touched={touched}
    dirty={dirty}
    error={error}
    options={options}
    optionsStatus={optionsStatus}
    optionsError={optionsError}
    className={className}
    description={description}
    disabled={disabled}
    readOnly={readOnly}
    id={id}
    ariaInvalid={ariaInvalid}
    ariaDescribedBy={ariaDescribedBy}
    ariaRequired={ariaRequired}
    min={min}
    max={max}
    step={step}
    accept={accept}
    multiple={multiple}
  />
{/snippet}

<!--
  A custom renderer owns its label and its error presentation; drawing them
  here as well would repeat what the consumer already shows.

  A built-in renderer is a bare control, so its label and its message are drawn
  here, in one element that keeps them together in a grid layout. A radio group
  is not a labelable element: its caption is a plain element the group names
  itself after (`aria-labelledby`). Every other built-in control gets a
  `<label for>`. The message's id is what `ariaDescribedBy` points at.
-->
{#if Renderer && registered}
  {@render control(Renderer)}
{:else if Renderer}
  <div class="dfk-field">
    {#if label && id}
      {#if type === 'radio'}
        <span id={makeLabelId(id)} class="dfk-field-label">{label}</span>
      {:else}
        <label id={makeLabelId(id)} for={id} class="dfk-field-label"
          >{label}</label
        >
      {/if}
    {/if}
    {@render control(Renderer)}
    {#if firstError && id}
      <div id={makeErrorId(id)} class="dfk-field-error" role="alert">
        {firstError}
      </div>
    {/if}
  </div>
{:else}
  <div>Unknown field type: {type}</div>
{/if}
