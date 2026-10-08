<script lang="ts">
  import type { FieldRegistry, FieldTypeKey } from '@dynamic-field-kit/core';
  import DynamicInput from '../../src/components/DynamicInput.svelte';
  import { provideFieldRegistry } from '../../src/fieldRegistryContext.js';

  // Provides a registry of its own to the input below it, the way an
  // application isolates one part of a page from the global registry.
  let { registry, type }: { registry: FieldRegistry; type: FieldTypeKey } =
    $props();

  provideFieldRegistry(registry);
</script>

<DynamicInput {type} id="scoped" value="x" />
