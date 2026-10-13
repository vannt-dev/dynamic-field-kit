<script lang="ts">
  import {
    buildFieldRendererProps,
    createOptionsLoader,
    isAsyncOptions,
    makeFieldId,
    type FieldDescription,
    type OptionsState,
    type Properties,
  } from '@dynamic-field-kit/core';
  import { onDestroy, tick, untrack } from 'svelte';
  import DynamicInput from './DynamicInput.svelte';

  interface Props {
    fieldDescription: FieldDescription;
    renderInfos: Properties;
    rootData?: Properties;
    /** Per-form-instance id namespace; see core's `makeFieldId`. */
    idPrefix?: string;
    onValueChangeField: (value: unknown, key: string) => void;
    onBlurField?: (key: string) => void;
    touched?: boolean;
    dirty?: boolean;
    errors?: Record<string, string[]>;
  }

  let {
    fieldDescription,
    renderInfos,
    rootData,
    idPrefix = 'dfk-field',
    onValueChangeField,
    onBlurField,
    touched,
    dirty,
    errors,
  }: Props = $props();

  // Async options only. A static or synchronous list allocates nothing here
  // and takes the path it always has. Decided once, from the field this
  // component was created for: a list keyed by field name gives each field a
  // component of its own.
  const asyncField = untrack(() =>
    isAsyncOptions(fieldDescription) ? fieldDescription : undefined,
  );
  let optionsState = $state.raw<OptionsState | undefined>(
    asyncField ? { status: 'idle' } : undefined,
  );
  const loader = asyncField
    ? createOptionsLoader(asyncField, (state) => {
        optionsState = state;
      })
    : undefined;

  if (loader) {
    // The loader decides whether `optionsDeps` actually changed, so handing it
    // the whole data object keeps that decision in one place.
    $effect(() => {
      loader.update(renderInfos, rootData);
    });
    onDestroy(() => loader.dispose());
  }

  // `parseInput` stays here: a masked field shows formatted text, and this
  // turns what its renderer reports back into the value to store.
  const { parseInput, ...rendererProps } = $derived(
    buildFieldRendererProps({
      fieldDescription,
      data: renderInfos,
      rootData,
      id: makeFieldId(fieldDescription, idPrefix),
      touched,
      dirty,
      validationErrors:
        errors === undefined ? undefined : (errors[fieldDescription.name] ?? []),
      optionsState,
      applyMask: true,
    }),
  );

  // What a renderer just reported, for the one update in which it has to be
  // told that this is not the text to show.
  let refused = $state.raw<{ text: string } | undefined>(undefined);

  function handleChange(input: unknown) {
    const shown = rendererProps.value;
    onValueChangeField(
      parseInput ? parseInput(input) : input,
      fieldDescription.name,
    );
    // The mask took nothing from what was typed (a letter where a digit
    // belongs, a character past the last place), so the text to show is what
    // it was. No prop changes then, and nothing writes the element again: the
    // refused character would stay on screen. Hand the renderer the text it
    // reported, then the text to show, so that it sees a change.
    if (
      parseInput &&
      typeof input === 'string' &&
      input !== shown &&
      rendererProps.value === shown
    ) {
      refused = { text: input };
      void tick().then(() => {
        refused = undefined;
      });
    }
  }
</script>

<DynamicInput
  {...rendererProps}
  value={refused ? refused.text : rendererProps.value}
  onChange={handleChange}
  onBlur={() => onBlurField?.(fieldDescription.name)}
  onOptionsQuery={loader ? (query) => loader.setQuery(query) : undefined}
/>
