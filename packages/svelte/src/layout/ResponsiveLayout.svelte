<script lang="ts" module>
  import { layoutRegistry } from './layoutRegistry.js';

  // Module-level so every responsive layout shares one resize listener.
  let windowWidth = $state(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth = window.innerWidth;
    });
  }

  function resolve(layout: unknown): {
    type: string;
    config: Record<string, unknown>;
  } {
    if (typeof layout === 'string') {
      return { type: layout, config: {} };
    }
    const named = layout as { type: string; [key: string]: unknown };
    return { type: named.type, config: named };
  }
</script>

<script lang="ts">
  import type { LayoutProps } from './layoutRegistry.js';

  interface ResponsiveConfig {
    mobile?: unknown;
    desktop?: unknown;
    breakpoint?: number;
  }

  let { config, children }: LayoutProps<ResponsiveConfig> = $props();

  const current = $derived(
    windowWidth < (config?.breakpoint ?? 768) ? config?.mobile : config?.desktop,
  );
  const inner = $derived(current ? resolve(current) : undefined);
  const Inner = $derived(inner ? layoutRegistry.get(inner.type) : undefined);
</script>

{#if Inner && inner}
  <Inner type={inner.type} config={inner.config}>{@render children()}</Inner>
{:else}
  <div>{@render children()}</div>
{/if}
