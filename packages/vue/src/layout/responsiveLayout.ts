import { h, ref } from 'vue';
import { layoutRegistry } from './layoutRegistry';

// Module-level so a single resize listener is shared by every responsive
// layout instance; reading `.value` inside another component's render still
// tracks the dependency correctly since Vue attributes reads to whichever
// effect is currently active, not to the function's lexical location.
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth;
  });
}

interface ResponsiveConfig {
  type: 'responsive';
  mobile?: unknown;
  desktop?: unknown;
  breakpoint?: number;
}

function resolve(layout: unknown): { type: string; config?: Record<string, unknown> } {
  if (typeof layout === 'string') {
    return { type: layout, config: {} };
  }
  const l = layout as { type: string; [k: string]: unknown };
  return { type: l.type, config: l };
}

layoutRegistry.register('responsive', ({ children, config }) => {
  const responsiveConfig = config as ResponsiveConfig;
  const breakpoint = responsiveConfig?.breakpoint ?? 768;
  const isMobile = windowWidth.value < breakpoint;
  const current = isMobile ? responsiveConfig?.mobile : responsiveConfig?.desktop;

  if (!current) {
    return h('div', {}, children);
  }

  const { type, config: childConfig } = resolve(current);
  const Renderer = layoutRegistry.get(type);

  if (!Renderer) {
    return h('div', {}, children);
  }

  return Renderer({ children, config: childConfig });
});
