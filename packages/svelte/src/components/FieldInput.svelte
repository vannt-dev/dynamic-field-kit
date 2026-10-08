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
  import { onDestroy, untrack } from 'svelte';
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

  const rendererProps = $derived(
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
    }),
  );
</script>

<DynamicInput
  {...rendererProps}
  onChange={(value) => onValueChangeField(value, fieldDescription.name)}
  onBlur={() => onBlurField?.(fieldDescription.name)}
  onOptionsQuery={loader ? (query) => loader.setQuery(query) : undefined}
/>
