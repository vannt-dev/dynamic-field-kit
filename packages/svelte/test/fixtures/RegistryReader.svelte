<script lang="ts">
  import type { FieldRegistry } from '@dynamic-field-kit/core';
  import { useFieldRegistry } from '../../src/fieldRegistryContext.js';

  // Reports the registry a component at this place in the tree would use.
  let { onRegistry }: { onRegistry: (registry: FieldRegistry) => void } =
    $props();

  onRegistry(useFieldRegistry());
</script>
