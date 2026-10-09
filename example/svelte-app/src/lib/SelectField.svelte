<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';
  import { t } from '../../../shared/i18n';
  import FieldShell from './FieldShell.svelte';
  import { optionLabel, optionValue, type Option } from './options';

  let {
    value,
    onValueChange,
    onBlur,
    label,
    options,
    disabled,
    readOnly,
    touched,
    error,
    id,
  }: FieldRendererProps = $props();
</script>

<FieldShell {label} {touched} {error}>
  <select
    class="field__control"
    {id}
    value={(value as string | undefined) ?? ''}
    disabled={disabled || readOnly}
    onchange={(event) => onValueChange?.(event.currentTarget.value)}
    onblur={() => onBlur?.()}
  >
    <option value="">{t('-- Choose --')}</option>
    {#each (options ?? []) as Option[] as option (optionValue(option))}
      <option value={optionValue(option)}>{optionLabel(option)}</option>
    {/each}
  </select>
</FieldShell>
