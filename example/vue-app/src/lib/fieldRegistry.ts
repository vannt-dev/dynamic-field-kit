import { fieldRegistry as registry } from '@dynamic-field-kit/vue';
import { defineComponent, h, type VNode } from 'vue';
import { t } from '../../../shared/i18n';

// The renderers this app draws its fields with. The kit's built-in renderers
// are bare inputs with no label and no styling, so an application registers
// its own for every type it uses - these are plain HTML styled by
// `example/shared/demo.css`.

const PROPS = [
  'value',
  'label',
  'placeholder',
  'disabled',
  'readOnly',
  'touched',
  'error',
  'options',
  'min',
  'max',
  'step',
  'id',
];
const EMITS = ['update:value', 'blur'];

type Option = { label?: string; value: string | number } | string;

const optionValue = (opt: Option) =>
  typeof opt === 'string' ? opt : opt.value;
const optionLabel = (opt: Option) =>
  typeof opt === 'string' ? opt : (opt.label ?? String(opt.value));

/** An error is shown once the field has been visited, not while it is pristine. */
function shownError(props: any): string | undefined {
  if (!props.touched || !props.error) return undefined;
  return Array.isArray(props.error) ? props.error.join(', ') : props.error;
}

function field(props: any, control: VNode, tag = 'label'): VNode {
  const error = shownError(props);
  return h(tag, { class: ['field', { 'field--invalid': error }] }, [
    props.label
      ? h(
          tag === 'label' ? 'span' : 'legend',
          { class: 'field__label' },
          props.label,
        )
      : null,
    control,
    error ? h('span', { class: 'field__error' }, error) : null,
  ]);
}

const input = (type: string) =>
  defineComponent({
    props: PROPS,
    emits: EMITS,
    setup(props: any, { emit }) {
      return () =>
        field(
          props,
          h('input', {
            type,
            class: 'field__control',
            value: props.value ?? '',
            placeholder: props.placeholder ?? '',
            disabled: props.disabled,
            readonly: props.readOnly,
            onInput: (e: Event) => {
              const raw = (e.target as HTMLInputElement).value;
              emit(
                'update:value',
                type === 'number'
                  ? raw === ''
                    ? undefined
                    : Number(raw)
                  : raw,
              );
            },
            onBlur: () => emit('blur'),
          }),
        );
    },
  });

const SelectRenderer = defineComponent({
  props: PROPS,
  emits: EMITS,
  setup(props: any, { emit }) {
    return () =>
      field(
        props,
        h(
          'select',
          {
            class: 'field__control',
            value: props.value ?? '',
            disabled: props.disabled || props.readOnly,
            onChange: (e: Event) =>
              emit('update:value', (e.target as HTMLSelectElement).value),
            onBlur: () => emit('blur'),
          },
          [
            h('option', { value: '' }, t('-- Choose --')),
            ...((props.options as Option[]) || []).map((opt) =>
              h(
                'option',
                { key: optionValue(opt), value: optionValue(opt) },
                optionLabel(opt),
              ),
            ),
          ],
        ),
      );
  },
});

const RadioRenderer = defineComponent({
  props: PROPS,
  emits: EMITS,
  setup(props: any, { emit }) {
    return () =>
      field(
        props,
        h(
          'div',
          { class: 'field__options' },
          ((props.options as Option[]) || []).map((opt) =>
            h('label', { key: optionValue(opt) }, [
              h('input', {
                type: 'radio',
                name: props.id,
                checked: props.value === optionValue(opt),
                disabled: props.disabled,
                onChange: () => emit('update:value', optionValue(opt)),
                onBlur: () => emit('blur'),
              }),
              optionLabel(opt),
            ]),
          ),
        ),
        'fieldset',
      );
  },
});

const RangeRenderer = defineComponent({
  props: PROPS,
  emits: EMITS,
  setup(props: any, { emit }) {
    return () =>
      field(
        props,
        h('span', { class: 'field__range' }, [
          h('input', {
            type: 'range',
            min: props.min,
            max: props.max,
            step: props.step,
            value: props.value ?? props.min ?? 0,
            disabled: props.disabled,
            onInput: (e: Event) =>
              emit(
                'update:value',
                Number((e.target as HTMLInputElement).value),
              ),
            onBlur: () => emit('blur'),
          }),
          h('output', String(props.value ?? '')),
        ]),
      );
  },
});

const CheckRenderer = defineComponent({
  props: PROPS,
  emits: EMITS,
  setup(props: any, { emit }) {
    return () =>
      h('label', { class: 'field field--inline' }, [
        h('input', {
          type: 'checkbox',
          checked: Boolean(props.value),
          disabled: props.disabled || props.readOnly,
          onChange: (e: Event) =>
            emit('update:value', (e.target as HTMLInputElement).checked),
          onBlur: () => emit('blur'),
        }),
        props.label,
      ]);
  },
});

for (const type of ['text', 'email', 'password', 'number', 'date']) {
  registry.register(type as any, input(type) as any);
}
registry.register('select', SelectRenderer as any);
registry.register('radio' as any, RadioRenderer as any);
registry.register('range' as any, RangeRenderer as any);
registry.register('checkbox' as any, CheckRenderer as any);
registry.register('switch' as any, CheckRenderer as any);

export {};
