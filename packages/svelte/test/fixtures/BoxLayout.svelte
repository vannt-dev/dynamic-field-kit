<script lang="ts">
  import type { LayoutProps } from '../../src/layout/layoutRegistry.js';

  // A layout an application registers itself.
  let { type, config, children }: LayoutProps<{ title?: string }> = $props();
</script>

<section data-layout={type} data-title={config?.title}>
  {@render children()}
</section>
