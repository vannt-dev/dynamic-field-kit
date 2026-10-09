<script lang="ts">
  import type { FieldRendererProps } from '@dynamic-field-kit/svelte';
  import InputField from './InputField.svelte';

  let props: FieldRendererProps = $props();
</script>

<InputField {...props} inputType="date" />
