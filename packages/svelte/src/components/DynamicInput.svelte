<script lang="ts">
  import {
    makeErrorId,
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

{#if Renderer}
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
  <!--
    A custom renderer owns its own error presentation; a second message next
    to it would repeat what the consumer already shows. The id is what
    `ariaDescribedBy` points at.
  -->
  {#if !registered && firstError && id}
    <div id={makeErrorId(id)} class="dfk-field-error" role="alert">
      {firstError}
    </div>
  {/if}
{:else}
  <div>Unknown field type: {type}</div>
{/if}
