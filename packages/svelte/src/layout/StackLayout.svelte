<script lang="ts">
  import type { LayoutProps } from './layoutRegistry.js';

  // One component for the built-in column, row and grid layouts: they differ
  // in a line of CSS, which `type` selects.
  let { type, config, children }: LayoutProps<Record<string, unknown>> =
    $props();

  const gap = $derived(`${config?.gap ?? 16}px`);
  const style = $derived(
    type === 'grid' || type === 'grid-2'
      ? `display: grid; grid-template-columns: repeat(${config?.columns ?? 2}, 1fr); gap: ${gap};`
      : `display: flex; flex-direction: ${type === 'row' ? 'row' : 'column'}; gap: ${gap};`,
  );
</script>

<div {style}>{@render children()}</div>
