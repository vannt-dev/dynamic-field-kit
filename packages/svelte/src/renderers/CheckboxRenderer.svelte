<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';

  // Also the renderer behind `switch`. A checkbox has no read-only state of
  // its own, so read-only disables it.
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
    ariaRequired,
  }: FieldRendererProps = $props();
</script>

<input
  type="checkbox"
  {id}
  class={className}
  checked={Boolean(value)}
  onchange={(event) => onValueChange?.(event.currentTarget.checked)}
  onblur={() => onBlur?.()}
  disabled={disabled || readOnly}
  {required}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
  aria-required={ariaRequired}
/>
