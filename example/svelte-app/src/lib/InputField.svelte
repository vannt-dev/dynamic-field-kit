<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';
  import FieldShell from './FieldShell.svelte';

  // One text-like input. `inputType` is not part of the renderer props: the
  // renderers registered for email, password, number and date pass it.
  let {
    value,
    onValueChange,
    onBlur,
    label,
    placeholder,
    disabled,
    readOnly,
    touched,
    error,
    id,
    inputType = 'text',
  }: FieldRendererProps & { inputType?: string } = $props();

  function change(raw: string) {
    // An emptied number field is "no value", not zero.
    onValueChange?.(
      inputType === 'number' ? (raw === '' ? undefined : Number(raw)) : raw,
    );
  }
</script>

<FieldShell {label} {touched} {error}>
  <input
    type={inputType}
    class="field__control"
    {id}
    value={(value as string | number | undefined) ?? ''}
    placeholder={placeholder ?? ''}
    {disabled}
    readonly={readOnly}
    oninput={(event) => change(event.currentTarget.value)}
    onblur={() => onBlur?.()}
  />
</FieldShell>
