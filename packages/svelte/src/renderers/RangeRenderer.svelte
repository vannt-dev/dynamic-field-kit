<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';

  let {
    value,
    onValueChange,
    onBlur,
    disabled,
    readOnly,
    required,
    id,
    className,
    ariaInvalid,
    ariaDescribedBy,
    min,
    max,
    step,
  }: FieldRendererProps = $props();
</script>

<input
  type="range"
  {id}
  class={className}
  {min}
  {max}
  {step}
  value={(value as number | undefined) ?? min ?? 0}
  oninput={(event) => onValueChange?.(Number(event.currentTarget.value))}
  onblur={() => onBlur?.()}
  disabled={disabled || readOnly}
  {required}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
/>
