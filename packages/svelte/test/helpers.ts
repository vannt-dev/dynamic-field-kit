import { FieldRegistry } from '@dynamic-field-kit/core';
import { flushSync, mount, unmount, type Component } from 'svelte';
import { afterEach } from 'vitest';
import { FieldRegistryKey } from '../src/fieldRegistryContext.js';
import ProbeRenderer from './fixtures/ProbeRenderer.svelte';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    password: string;
    email: string;
    textarea: string;
    checkbox: boolean;
    select: string;
    radio: string;
    range: number;
    file: unknown;
    date: string;
    time: string;
    'datetime-local': string;
    switch: boolean;
    probe: string;
    mystery: string;
  }
}

const mounted: Array<Record<string, unknown>> = [];

afterEach(() => {
  for (const component of mounted.splice(0)) {
    unmount(component);
  }
  document.body.innerHTML = '';
});

/** A registry of its own with the probe renderer under the type `probe`. */
export function probeRegistry(): FieldRegistry {
  const registry = new FieldRegistry();
  registry.register('probe', ProbeRenderer as never);
  return registry;
}

/**
 * Mounts a component into the document and returns it with its container.
 * `registry` is given to it as the field registry of its subtree.
 */
export function render<Props extends Record<string, any>>(
  component: Component<Props, any>,
  props: Props,
  registry?: FieldRegistry,
) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const instance = mount(component as Component<Props, Record<string, any>>, {
    target,
    props,
    context: registry ? new Map([[FieldRegistryKey, registry]]) : undefined,
  });
  mounted.push(instance);
  flushSync();
  return { target, instance };
}

/** Types into an input the way a user does, then lets Svelte catch up. */
export function type(element: Element, value: string) {
  (element as HTMLInputElement).value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

export function fire(element: Element, event: string) {
  element.dispatchEvent(new Event(event, { bubbles: true }));
  flushSync();
}

export function click(element: Element) {
  (element as HTMLElement).click();
  flushSync();
}

/**
 * Lets pending promises (an async validator, an options request, a submit)
 * settle, then lets Svelte catch up. A turn of the timer queue rather than a
 * count of microtasks: how many of those a chain of awaits takes is not
 * something a test should know.
 */
export async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  flushSync();
}

/** Runs something that changes state from outside, then lets Svelte catch up. */
export function act(change: () => void) {
  change();
  flushSync();
}
