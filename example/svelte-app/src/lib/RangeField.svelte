<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';
  import FieldShell from './FieldShell.svelte';

  let {
    value,
    onValueChange,
    onBlur,
    label,
    disabled,
    touched,
    error,
    id,
    min,
    max,
    step,
  }: FieldRendererProps = $props();
</script>

<FieldShell {label} {touched} {error}>
  <span class="field__range">
    <input
      type="range"
      {id}
      {min}
      {max}
      {step}
      value={(value as number | undefined) ?? min ?? 0}
      {disabled}
      oninput={(event) => onValueChange?.(Number(event.currentTarget.value))}
      onblur={() => onBlur?.()}
    />
    <output>{value ?? ''}</output>
  </span>
</FieldShell>
