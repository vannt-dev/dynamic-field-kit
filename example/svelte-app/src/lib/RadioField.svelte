<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';
  import FieldShell from './FieldShell.svelte';
  import { optionLabel, optionValue, type Option } from './options';

  let {
    value,
    onValueChange,
    onBlur,
    label,
    options,
    disabled,
    touched,
    error,
    id,
  }: FieldRendererProps = $props();
</script>

<FieldShell {label} {touched} {error} group>
  <div class="field__options">
    {#each (options ?? []) as Option[] as option (optionValue(option))}
      <label>
        <input
          type="radio"
          name={id}
          checked={value === optionValue(option)}
          {disabled}
          onchange={() => onValueChange?.(optionValue(option))}
          onblur={() => onBlur?.()}
        />
        {optionLabel(option)}
      </label>
    {/each}
  </div>
</FieldShell>
