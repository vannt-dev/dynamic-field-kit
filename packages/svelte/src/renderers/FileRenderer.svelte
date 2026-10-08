<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';

  // A file input cannot be given a value, so `value` is not read.
  let {
    onValueChange,
    onBlur,
    disabled,
    readOnly,
    required,
    id,
    className,
    ariaInvalid,
    ariaDescribedBy,
    accept,
    multiple,
  }: FieldRendererProps = $props();

  // The value is the chosen file, or the list of them for `multiple`.
  function change(files: FileList | null) {
    if (!files) {
      return;
    }
    onValueChange?.(multiple ? Array.from(files) : (files[0] ?? null));
  }
</script>

<input
  type="file"
  {id}
  class={className}
  {accept}
  {multiple}
  onchange={(event) => change(event.currentTarget.files)}
  onblur={() => onBlur?.()}
  disabled={disabled || readOnly}
  {required}
  aria-invalid={ariaInvalid}
  aria-describedby={ariaDescribedBy}
/>
