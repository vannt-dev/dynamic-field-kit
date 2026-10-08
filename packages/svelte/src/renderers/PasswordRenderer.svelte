<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/core';
  import TextRenderer from './TextRenderer.svelte';

  let props: FieldRendererProps = $props();
</script>

<TextRenderer {...props} inputType="password" />
