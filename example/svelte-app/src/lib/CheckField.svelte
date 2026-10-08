<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';

  // The label sits beside the box, so this renderer does not use FieldShell.
  let {
    value,
    onValueChange,
    onBlur,
    label,
    disabled,
    readOnly,
    id,
  }: FieldRendererProps = $props();
</script>

<label class="field field--inline">
  <input
    type="checkbox"
    {id}
    checked={Boolean(value)}
    disabled={disabled || readOnly}
    onchange={(event) => onValueChange?.(event.currentTarget.checked)}
    onblur={() => onBlur?.()}
  />
  {label}
</label>
