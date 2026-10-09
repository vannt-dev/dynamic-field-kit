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
  }: FieldRendererProps = $props();

  const shown = $derived(readOptions(options));
</script>

<!--
  Focus leaving any of the buttons is the blur of the field. The group, not
  each button, says whether the field is invalid and what describes it.
-->
<div
  class="dfk-radio-group {className ?? ''}"
  {id}
  role="radiogroup"
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
  onfocusout={() => onBlur?.()}
>
  {#each shown as option, index (String(option.value) + index)}
    <label
      style="margin-right: 12px; display: inline-flex; align-items: center;"
    >
      <input
        type="radio"
        id="{id || 'radio'}-{index}"
        name={id}
        value={String(option.value)}
        checked={String(value) === String(option.value)}
        onchange={() => onValueChange?.(option.value)}
        disabled={disabled || readOnly}
        {required}
      />
      <span style="margin-left: 4px;">{option.label}</span>
    </label>
  {/each}
</div>
