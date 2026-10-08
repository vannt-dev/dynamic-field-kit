<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';

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
  }: FieldRendererProps = $props();
</script>

<textarea
  {id}
  class={className}
  value={(value as string | undefined) ?? ''}
  oninput={(event) => onValueChange?.(event.currentTarget.value)}
  onblur={() => onBlur?.()}
  {disabled}
  readonly={readOnly}
  {required}
  {placeholder}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
  aria-required={ariaRequired}
></textarea>
