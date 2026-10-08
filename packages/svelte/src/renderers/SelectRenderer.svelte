<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';
  import { readOptions } from './options.js';

  let {
    value,
    onValueChange,
    onBlur,
    options,
    disabled,
    readOnly,
    required,
    id,
    className,
    ariaInvalid,
    ariaDescribedBy,
    ariaRequired,
  }: FieldRendererProps = $props();

  const shown = $derived(readOptions(options));
  const selected = $derived(
    value === undefined || value === null ? '' : String(value),
  );
</script>

<select
  {id}
  class={className}
  value={selected}
  onchange={(event) => onValueChange?.(event.currentTarget.value)}
  onblur={() => onBlur?.()}
  disabled={disabled || readOnly}
  {required}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
  aria-required={ariaRequired}
>
  <option value="" disabled>-- Select --</option>
  {#each shown as option, index (String(option.value) + index)}
    <option value={String(option.value)}>{option.label}</option>
  {/each}
</select>
