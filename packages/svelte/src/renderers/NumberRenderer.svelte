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

  // An emptied field is "no value", not the number zero.
  function change(text: string) {
    onValueChange?.(text === '' ? undefined : Number(text));
  }
</script>

<input
  type="number"
  {id}
  class={className}
  value={(value as number | undefined) ?? ''}
  oninput={(event) => change(event.currentTarget.value)}
  onblur={() => onBlur?.()}
  {disabled}
  readonly={readOnly}
  {required}
  {placeholder}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
  aria-required={ariaRequired}
/>
