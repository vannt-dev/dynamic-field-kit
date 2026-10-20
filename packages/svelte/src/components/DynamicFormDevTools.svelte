<script lang="ts" module>
  import type { FieldDescription, Properties } from '@dynamic-field-kit/core';

  /** The slice of `createDynamicForm`'s result the overlay reads. */
  export interface DevToolsFormSource {
    readonly data: Properties;
    readonly errors: Record<string, string[]>;
    readonly touched: Record<string, boolean>;
    readonly isDirty: boolean;
  }

  export interface DynamicFormDevToolsProps {
    data?: Properties;
    errors?: Record<string, string[]>;
    touched?: Record<string, boolean>;
    isDirty?: boolean;
    fields?: FieldDescription[];
    position?: 'bottom-right' | 'bottom-left';
    /**
     * A form from `createDynamicForm`, read for `data`, `errors`, `touched`
     * and `isDirty`. A prop passed next to it wins, the way it does on
     * `MultiFieldInput`.
     */
    form?: DevToolsFormSource;
  }

  const TABS = ['data', 'errors', 'meta', 'fields'] as const;
  type Tab = (typeof TABS)[number];
</script>

<script lang="ts">
  let {
    data,
    errors,
    touched,
    isDirty,
    fields = [],
    position = 'bottom-right',
    form,
  }: DynamicFormDevToolsProps = $props();

  let isOpen = $state(false);
  let activeTab = $state<Tab>('data');

  const shownData = $derived(data ?? form?.data ?? {});
  const shownErrors = $derived(errors ?? form?.errors ?? {});
  const shownTouched = $derived(touched ?? form?.touched ?? {});
  const shownDirty = $derived(isDirty ?? form?.isDirty ?? false);
  const errorCount = $derived(Object.keys(shownErrors).length);

  const posStyle = $derived(
    position === 'bottom-left'
      ? 'left: 16px; bottom: 16px;'
      : 'right: 16px; bottom: 16px;',
  );

  const toggleStyle =
    'position: fixed; z-index: 99999; background: #1e293b; color: #f8fafc; ' +
    'border: 1px solid #334155; border-radius: 20px; padding: 8px 14px; ' +
    'font-size: 12px; font-weight: 600; cursor: pointer; ' +
    'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); display: flex; ' +
    'align-items: center; gap: 6px;';
  const panelStyle =
    'position: fixed; z-index: 99999; width: 360px; max-height: 420px; ' +
    'background: #0f172a; color: #f8fafc; border: 1px solid #334155; ' +
    'border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); ' +
    'display: flex; flex-direction: column; ' +
    'font-family: monospace, sans-serif; font-size: 12px; overflow: hidden;';

  function tabStyle(tab: Tab): string {
    const active = activeTab === tab;
    return (
      `flex: 1; padding: 6px 0; background: ${active ? '#0f172a' : 'transparent'}; ` +
      `color: ${active ? '#38bdf8' : '#94a3b8'}; border: none; cursor: pointer; ` +
      `text-transform: capitalize; font-size: 11px; ` +
      `font-weight: ${active ? 'bold' : 'normal'};`
    );
  }
</script>

{#if !isOpen}
  <button
    type="button"
    onclick={() => (isOpen = true)}
    style="{toggleStyle} {posStyle}"
  >
    <span>🔍 DevTools</span>
    {#if errorCount > 0}
      <span
        style="background: #ef4444; color: #fff; border-radius: 10px; padding: 2px 6px; font-size: 10px;"
        >{errorCount}</span
      >
    {/if}
  </button>
{:else}
  <div style="{panelStyle} {posStyle}">
    <div
      style="padding: 10px 14px; background: #1e293b; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;"
    >
      <span style="font-weight: bold; color: #38bdf8;">🛠️ Form DevTools</span>
      <button
        type="button"
        onclick={() => (isOpen = false)}
        style="background: transparent; border: none; color: #94a3b8; font-size: 14px; cursor: pointer;"
      >
        ✕
      </button>
    </div>

    <div
      style="display: flex; background: #1e293b; border-bottom: 1px solid #334155;"
    >
      {#each TABS as tab (tab)}
        <button
          type="button"
          onclick={() => (activeTab = tab)}
          style={tabStyle(tab)}
        >
          {tab}
          {tab === 'errors' && errorCount > 0 ? `(${errorCount})` : ''}
        </button>
      {/each}
    </div>

    <div style="padding: 12px; overflow-y: auto; flex: 1;">
      {#if activeTab === 'data'}
        <pre
          style="margin: 0; white-space: pre-wrap; word-break: break-all; color: #a7f3d0;">{JSON.stringify(
            shownData,
            null,
            2,
          )}</pre>
      {:else if activeTab === 'errors'}
        <div>
          {#if errorCount === 0}
            <span style="color: #4ade80;">✓ No validation errors</span>
          {:else}
            {#each Object.entries(shownErrors) as [field, messages] (field)}
              <div style="margin-bottom: 8px;">
                <span style="color: #f87171; font-weight: bold;">{field}:</span>
                <ul style="margin: 4px 0 0 16px; padding: 0;">
                  {#each messages as message, index (index)}
                    <li style="color: #fca5a5;">{message}</li>
                  {/each}
                </ul>
              </div>
            {/each}
          {/if}
        </div>
      {:else if activeTab === 'meta'}
        <div>
          <div style="margin-bottom: 6px;">
            <span style="color: #94a3b8;">isDirty: </span>
            <span style="color: {shownDirty ? '#facc15' : '#4ade80'};"
              >{String(shownDirty)}</span
            >
          </div>
          <div>
            <span style="color: #94a3b8;">Touched Fields:</span>
            <pre style="margin: 4px 0 0 0; color: #cbd5e1;">{JSON.stringify(
                shownTouched,
                null,
                2,
              )}</pre>
          </div>
        </div>
      {:else}
        <div>
          {#if fields.length === 0}
            <span style="color: #94a3b8;">No field descriptions passed</span>
          {:else}
            {#each fields as field (field.name)}
              <div
                style="padding: 6px; margin-bottom: 6px; background: #1e293b; border-radius: 4px;"
              >
                <div style="color: #38bdf8; font-weight: bold;">
                  {field.name}
                </div>
                <div style="color: #94a3b8; font-size: 10px;">
                  type: {field.type} | required: {String(Boolean(field.required))}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
