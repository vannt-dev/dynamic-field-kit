<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';

  // Also the renderer behind password, email, date, time and datetime-local,
  // which differ only in the type of the input.
  let {
    value,
    onValueChange,
    onBlur,
    disabled,
    readOnly,
    required,
    placeholder,
    id,
    className,
    ariaInvalid,
    ariaDescribedBy,
    ariaRequired,
    inputType = 'text',
  }: FieldRendererProps & { inputType?: string } = $props();
</script>

<input
  type={inputType}
  {id}
  class={className}
  value={(value as string | number | undefined) ?? ''}
  oninput={(event) => onValueChange?.(event.currentTarget.value)}
  onblur={() => onBlur?.()}
  {disabled}
  readonly={readOnly}
  {required}
  {placeholder}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
  aria-required={ariaRequired}
/>
