<script lang="ts" module>
  import type { Properties } from '@dynamic-field-kit/core';

  /**
   * The slice of `createDynamicForm`'s result `MultiFieldInput` needs to drive
   * itself. Passing the whole form satisfies it.
   */
  export interface DynamicFormBinding {
    readonly data: Properties;
    readonly errors: Record<string, string[]>;
    readonly touched: Record<string, boolean>;
    /** The values per-field `dirty` is measured against. */
    readonly baselineValues?: Properties;
    handleChange: (data: Properties) => void;
    handleBlur: (fieldName: string) => void;
  }

  /** Shared so an untouched item keeps a stable touched-map identity. */
  const EMPTY_TOUCHED: Record<string, boolean> = Object.freeze({});

  // Unique per component instance, so two forms rendering the same field name
  // do not emit duplicate DOM ids.
  let instances = 0;
</script>

<script lang="ts">
  import {
    applyComputedValues,
    canAddGroupItem,
    canRemoveGroupItem,
    createGroupItem,
    indexGroupPathMap,
    validateFields,
    type FieldDescription,
    type LayoutConfig,
    type ValidationResult,
  } from '@dynamic-field-kit/core';
  import { layoutRegistry } from '../layout/layoutRegistry.js';
  import FieldInput from './FieldInput.svelte';
  // Repeatable field groups render a nested MultiFieldInput per item.
  import Self from './MultiFieldInput.svelte';

  interface Props {
    fieldDescriptions: FieldDescription[];
    /**
     * The form's values. Left undefined rather than `{}` when unset, so the
     * `form` shorthand can tell "no properties passed" from "an empty object".
     */
    properties?: Properties;
    /**
     * The values per-field `dirty` is measured against. Defaults to the first
     * non-undefined `properties` this component sees - what an edit form wants
     * when its values arrive from a fetch after mount. Supplied automatically
     * by the `form` shorthand.
     */
    initialProperties?: Properties;
    onChange?: (data: Properties) => void;
    layout?: LayoutConfig;
    /**
     * Top-level form data, threaded down through repeatable groups so a nested
     * field's appearCondition/computeValue can read the root form. Omitted at
     * the top level, where the form's own data is the root.
     */
    rootData?: Properties;
    onValidityChange?: (result: ValidationResult) => void;
    /**
     * Called with a field's name when it loses focus. Touched state is tracked
     * internally either way; this is the hook for an external form store.
     */
    onBlurField?: (fieldName: string) => void;
    /**
     * Namespace for generated field ids: a field renders with
     * `${idPrefix}-${name}`. Defaults to a value unique to this component
     * instance. Pass a fixed string to pin ids, or set `FieldDescription.id`
     * per field.
     */
    idPrefix?: string;
    /**
     * Controlled touched map. When provided it is the single source of truth
     * and the internal, blur-only tracker is bypassed.
     */
    touched?: Record<string, boolean>;
    /**
     * Controlled error map. When supplied (directly or through `form`), it is
     * the renderer's source of truth instead of live per-field validation.
     */
    errors?: Record<string, string[]>;
    /** Fires with the next touched map whenever a field is blurred. */
    onTouchedChange?: (touched: Record<string, boolean>) => void;
    /**
     * Shorthand wiring `properties`, `onChange`, `onBlurField`, `touched` and
     * `errors` from a `createDynamicForm` result in one prop. Individually
     * passed props win over the ones derived from here.
     */
    form?: DynamicFormBinding;
  }

  let {
    fieldDescriptions,
    properties,
    initialProperties,
    onChange,
    layout,
    rootData,
    onValidityChange,
    onBlurField,
    idPrefix,
    touched,
    errors,
    onTouchedChange,
    form,
  }: Props = $props();

  const instanceId = ++instances;
  const effectiveIdPrefix = $derived(idPrefix ?? `dfk-${instanceId}`);

  // Explicit props take precedence over the `form` shorthand, so a caller can
  // pass `form` and still override one wire.
  const effectiveProperties = $derived(
    properties !== undefined ? properties : form ? form.data : undefined,
  );
  const controlledTouched = $derived(
    touched !== undefined ? touched : form ? form.touched : undefined,
  );
  const effectiveErrors = $derived(
    errors !== undefined ? errors : form ? form.errors : undefined,
  );

  let touchedFields = $state.raw<Record<string, boolean>>({});
  const effectiveTouched = $derived(controlledTouched ?? touchedFields);

  // What the fields show: the properties handed in, with computed values
  // applied - or, once the user has changed something, that change. A change
  // is kept for as long as the properties it was made on are still the ones
  // handed in: an owner that answers `onChange` with new properties replaces
  // it, and a form used without `properties` keeps its own values.
  let edited = $state.raw<{
    on: Properties | undefined;
    data: Properties;
  }>();
  const data = $derived(
    edited && edited.on === effectiveProperties
      ? edited.data
      : applyComputedValues(
          fieldDescriptions,
          { ...effectiveProperties },
          rootData,
        ),
  );

  // Baseline for the `dirty` flag. Tracks the first non-undefined properties
  // rather than `{}` at mount: values that arrive from a fetch after mount
  // would otherwise mark every field dirty forever. Re-basing on every change
  // is not an option - in controlled mode the data gets a new identity on
  // every keystroke, which would pin `dirty` to false instead.
  let firstSeenProperties: Properties | undefined;
  const firstSeen = $derived.by(() => {
    if (firstSeenProperties === undefined && effectiveProperties !== undefined) {
      firstSeenProperties = { ...effectiveProperties };
    }
    return firstSeenProperties;
  });
  const baseline = $derived(
    initialProperties ?? form?.baselineValues ?? firstSeen ?? {},
  );

  function emitChange(next: Properties) {
    if (onChange) {
      onChange(next);
    } else {
      form?.handleChange(next);
    }
  }

  function handleBlurField(key: string) {
    if (controlledTouched === undefined) {
      touchedFields = { ...touchedFields, [key]: true };
    }
    onTouchedChange?.({ ...effectiveTouched, [key]: true });
    if (onBlurField) {
      onBlurField(key);
    } else {
      form?.handleBlur(key);
    }
  }

  /**
   * Clears the internally tracked touched state. Only meaningful in
   * uncontrolled mode - when `touched` is passed, resetting the form store
   * (`createDynamicForm().reset()`) already clears it.
   */
  export function resetTouched() {
    touchedFields = {};
  }

  export function setFieldTouched(fieldName: string, isTouched = true) {
    if (controlledTouched === undefined) {
      touchedFields = { ...touchedFields, [fieldName]: isTouched };
    }
    onTouchedChange?.({ ...effectiveTouched, [fieldName]: isTouched });
  }

  export function getTouched(): Record<string, boolean> {
    return effectiveTouched;
  }

  $effect(() => {
    onValidityChange?.(validateFields(fieldDescriptions, data, rootData));
  });

  const visibleFields = $derived(
    fieldDescriptions.filter(
      (field) =>
        !field.appearCondition || field.appearCondition(data, rootData ?? data),
    ),
  );

  const layoutInfo = $derived(
    !layout
      ? { type: 'column', config: {} }
      : typeof layout === 'string'
        ? { type: layout, config: {} }
        : { type: layout.type, config: layout },
  );
  const Layout = $derived(layoutRegistry.get(layoutInfo.type));

  function commitData(next: Properties) {
    const computed = applyComputedValues(fieldDescriptions, next, rootData);
    edited = { on: effectiveProperties, data: computed };
    emitChange({ ...computed });
  }

  function handleValueChange(value: unknown, key: string) {
    commitData({ ...data, [key]: value });
  }

  function getItems(field: FieldDescription): Properties[] {
    const value = data[field.name];
    return Array.isArray(value) ? (value as Properties[]) : [];
  }

  function handleGroupItemChange(
    field: FieldDescription,
    index: number,
    next: Properties,
  ) {
    const items = getItems(field).slice();
    items[index] = next;
    commitData({ ...data, [field.name]: items });
  }

  function handleGroupItemAdd(field: FieldDescription) {
    const items = getItems(field);
    if (!canAddGroupItem(field, items)) {
      return;
    }
    commitData({ ...data, [field.name]: [...items, createGroupItem(field)] });
  }

  function handleGroupItemRemove(field: FieldDescription, index: number) {
    const items = getItems(field);
    if (!canRemoveGroupItem(field, items)) {
      return;
    }
    commitData({
      ...data,
      [field.name]: items.filter((_, at) => at !== index),
    });
  }

  function itemKey(
    field: FieldDescription,
    item: Properties,
    index: number,
  ): string | number {
    return field.keyField
      ? ((item[field.keyField] as string | number | undefined) ?? index)
      : index;
  }

  const errorsByGroup = $derived(
    Object.fromEntries(
      fieldDescriptions.map((field) => [
        field.name,
        indexGroupPathMap(effectiveErrors, field.name),
      ]),
    ),
  );
  const touchedByGroup = $derived(
    Object.fromEntries(
      fieldDescriptions.map((field) => [
        field.name,
        indexGroupPathMap(effectiveTouched, field.name),
      ]),
    ),
  );
</script>

{#if Layout}
  <Layout type={layoutInfo.type} config={layoutInfo.config}>
    {#each visibleFields as field (field.name)}
      {#if field.fields}
        {@const items = getItems(field)}
        {@const groupName = field.label ?? field.name}
        {@const addText = field.addLabel ?? 'Add'}
        {@const removeText = field.removeLabel ?? 'Remove'}
        <div class={field.className}>
          {#if field.label}<div>{field.label}</div>{/if}
          {#each items as item, index (itemKey(field, item, index))}
            <div style="display: flex; align-items: flex-start; gap: 8px;">
              <div style="flex: 1;">
                <!--
                  An item with no touched keys still has to receive a map, or
                  the nested input reads `undefined` as "uncontrolled" and
                  starts tracking touched on its own - which then survives
                  the owner clearing the map.
                -->
                <Self
                  fieldDescriptions={field.fields}
                  properties={item}
                  rootData={rootData ?? data}
                  errors={errorsByGroup[field.name]?.[index]}
                  touched={controlledTouched === undefined
                    ? undefined
                    : (touchedByGroup[field.name]?.[index] ?? EMPTY_TOUCHED)}
                  onBlurField={(key) =>
                    handleBlurField(`${field.name}[${index}].${key}`)}
                  onChange={(next) => handleGroupItemChange(field, index, next)}
                />
              </div>
              <button
                type="button"
                aria-label="{removeText} {groupName} {index + 1}"
                onclick={() => handleGroupItemRemove(field, index)}
                disabled={!canRemoveGroupItem(field, items)}
              >
                {removeText}
              </button>
            </div>
          {/each}
          <button
            type="button"
            aria-label="{addText} {groupName}"
            onclick={() => handleGroupItemAdd(field)}
            disabled={!canAddGroupItem(field, items)}
          >
            {addText}
          </button>
        </div>
      {:else}
        <FieldInput
          fieldDescription={field}
          renderInfos={data}
          rootData={rootData ?? data}
          idPrefix={effectiveIdPrefix}
          touched={Boolean(effectiveTouched[field.name])}
          errors={effectiveErrors}
          dirty={!Object.is(data[field.name], baseline[field.name])}
          onValueChangeField={handleValueChange}
          onBlurField={handleBlurField}
        />
      {/if}
    {/each}
  </Layout>
{:else}
  <div>Unknown layout: {layoutInfo.type}</div>
{/if}
