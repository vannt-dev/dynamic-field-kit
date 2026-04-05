import { layoutRegistry } from './layoutRegistry';

interface GridConfig {
  gap?: number;
  columns?: number;
}

layoutRegistry.register('column', ({ children, config }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: (config as { gap?: number })?.gap ?? 12,
    }}
  >
    {children}
  </div>
));

layoutRegistry.register('row', ({ children, config }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'row',
      gap: (config as { gap?: number })?.gap ?? 12,
    }}
  >
    {children}
  </div>
));

layoutRegistry.register('grid', ({ children, config }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${
        (config as GridConfig)?.columns ?? 2
      }, 1fr)`,
      gap: (config as GridConfig)?.gap ?? 12,
    }}
  >
    {children}
  </div>
));
