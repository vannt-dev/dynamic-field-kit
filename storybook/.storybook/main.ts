import type { StorybookConfig } from '@storybook/react-vite';
import { dedupe, packageAliases } from '../vite.shared.ts';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: { ...packageAliases },
      dedupe,
    },
  }),
};

export default config;
