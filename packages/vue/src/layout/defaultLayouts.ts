import { h } from 'vue';
import { layoutRegistry } from './layoutRegistry';

layoutRegistry.register('column', ({ children, config }) => {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: `${config?.gap ?? 16}px`,
      },
    },
    children
  );
});

layoutRegistry.register('row', ({ children, config }) => {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'row',
        gap: `${config?.gap ?? 16}px`,
      },
    },
    children
  );
});

const renderGrid = ({
  children,
  config,
}: {
  children: unknown[];
  config?: Record<string, unknown>;
}) =>
  h(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${config?.columns ?? 2}, 1fr)`,
        gap: `${config?.gap ?? 16}px`,
      },
    },
    children as never[]
  );

layoutRegistry.register('grid', renderGrid);
layoutRegistry.register('grid-2', renderGrid);
