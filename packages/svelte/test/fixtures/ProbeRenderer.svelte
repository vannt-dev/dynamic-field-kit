<script lang="ts" module>
  /** The props the most recently rendered probe received, by field id. */
  export const seen = new Map<string, Record<string, unknown>>();
</script>

<script lang="ts">
  // A custom renderer for tests: an input that also publishes every prop it
  // was given, so a test can assert on the whole renderer contract.
  let props: Record<string, unknown> = $props();

  $effect.pre(() => {
    seen.set(String(props.id), { ...props });
  });

  const change = $derived(
    props.onValueChange as ((value: unknown) => void) | undefined,
  );
  const blur = $derived(props.onBlur as (() => void) | undefined);
</script>

<input
  data-probe
  id={props.id as string | undefined}
  class={props.className as string | undefined}
  value={(props.value as string | undefined) ?? ''}
  data-touched={String(props.touched)}
  data-dirty={String(props.dirty)}
  data-error={Array.isArray(props.error)
    ? props.error.join('|')
    : ((props.error as string | undefined) ?? '')}
  oninput={(event) => change?.(event.currentTarget.value)}
  onblur={() => blur?.()}
/>
