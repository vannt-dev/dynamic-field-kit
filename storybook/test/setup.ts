import { setProjectAnnotations } from '@storybook/react-vite';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import * as preview from '../.storybook/preview';

// The stories render with the same parameters and decorators as in Storybook.
setProjectAnnotations([preview]);

afterEach(() => cleanup());
