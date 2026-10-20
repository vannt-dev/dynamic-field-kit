import type { Preview } from '@storybook/react-vite';
// The look of the live demos. The kit ships no styles of its own.
import '../../example/shared/demo.css';
// The React package registers its built-in layouts from its entry point. Read
// from source, the production build drops that import, so it is made here.
import '../../packages/react/src/layout/defaultLayouts';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    layout: 'padded',
  },
};

export default preview;
