import { layoutRegistry } from './layoutRegistry.js';
import ResponsiveLayout from './ResponsiveLayout.svelte';
import StackLayout from './StackLayout.svelte';

layoutRegistry.register('column', StackLayout);
layoutRegistry.register('row', StackLayout);
layoutRegistry.register('grid', StackLayout);
layoutRegistry.register('grid-2', StackLayout);
layoutRegistry.register('responsive', ResponsiveLayout);
