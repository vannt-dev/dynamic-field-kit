/**
 * Regression tests for the issues reported against 1.5.1. Mirrors
 * packages/react/test/reportedIssues.test.tsx so the two adapters are held to
 * the same behaviour.
 */
import type { FieldDescription } from '@dynamic-field-kit/core';
import { fieldRegistry } from '@dynamic-field-kit/core';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h, PropType } from 'vue';
import MultiFieldInput from '../src/components/MultiFieldInput';
import { useDynamicForm } from '../src/useDynamicForm';
import '../src/layout/defaultLayouts';

/** Mirrors what an app renderer does: show the error only once touched. */
const TextRenderer = defineComponent({
  name: 'TextRenderer',
  props: {
    id: String,
    value: null,
    label: String,
    placeholder: String,
    touched: Boolean,
    required: Boolean,
    dirty: Boolean,
    error: [String, Array] as PropType<string | string[]>,
    onValueChange: Function as PropType<(v: unknown) => void>,
    'onUpdate:value': Function as PropType<(v: unknown) => void>,
    onBlur: Function as PropType<() => void>,
  },
  setup(props) {
    return () =>
      h('div', [
        h('input', {
          id: props.id,
          'data-testid': props.id,
          'data-label': props.label,
          placeholder: props.placeholder,
          value: (props.value as string) ?? '',
          onBlur: props.onBlur,
        }),
        props.touched && props.error
          ? h('span', { role: 'alert' }, [props.error].flat()[0] as string)
          : null,
      ]);
  },
});

beforeEach(() => {
  fieldRegistry.register('text', TextRenderer as never);
});

describe('issue 1: duplicate field ids across form instances (Vue)', () => {
  const fields: FieldDescription[] = [
    { name: 'title', type: 'text', label: 'Title' },
  ];

  it('gives two forms sharing a field name different ids', () => {
    const Host = defineComponent({
      setup: () => () =>
        h('div', [
          h(MultiFieldInput, { fieldDescriptions: fields }),
          h(MultiFieldInput, { fieldDescriptions: fields }),
        ]),
    });
    const wrapper = mount(Host);

    const ids = wrapper.findAll('input').map((i) => i.attributes('id'));
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('produces ids usable as CSS selectors', () => {
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields },
    });

    const id = wrapper.find('input').attributes('id') as string;
    expect(id).toMatch(/^[A-Za-z][\w-]*$/);
  });

  it('honours an explicit idPrefix', () => {
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, idPrefix: 'dfk-field' },
    });

    expect(wrapper.find('input').attributes('id')).toBe('dfk-field-title');
  });

  it('lets a field pin its own id', () => {
    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [{ ...fields[0], id: 'login-title' }],
      },
    });

    expect(wrapper.find('input').attributes('id')).toBe('login-title');
  });
});

describe('issue 2/3: touched is controllable and resettable (Vue)', () => {
  const fields: FieldDescription[] = [
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      validate: (v) => (v ? undefined : 'Required'),
    },
  ];

  const Form = defineComponent({
    setup() {
      const form = useDynamicForm({ fields, initialValues: { username: '' } });
      const submit = form.handleSubmit(() => {});
      return () =>
        h('form', { onSubmit: submit }, [
          h(MultiFieldInput, { fieldDescriptions: fields, form }),
          h('button', { type: 'submit' }, 'Submit'),
          h('button', { type: 'button', onClick: () => form.reset() }, 'Reset'),
        ]);
    },
  });

  it('shows the error on submit without the field ever being focused', async () => {
    const wrapper = mount(Form);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toBe('Required');
  });

  it('clears the error after reset', async () => {
    const wrapper = mount(Form);

    await wrapper.find('input').trigger('blur');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('exposes resetTouched for the uncontrolled mode', async () => {
    const wrapper = mount(MultiFieldInput, {
      props: { fieldDescriptions: fields, properties: { username: '' } },
    });

    await wrapper.find('input').trigger('blur');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    (wrapper.vm as unknown as { resetTouched: () => void }).resetTouched();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('touchAll marks every field touched', () => {
    const form = useDynamicForm({ fields });
    expect(form.touched.value).toEqual({});
    form.touchAll();
    expect(form.touched.value).toEqual({ username: true });
  });
});

describe('issue 4: FieldDescription props reach the renderer (Vue)', () => {
  it('forwards placeholder declared at the top level', () => {
    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [
          {
            name: 'username',
            type: 'text',
            label: 'Username',
            placeholder: 'Type your name',
          },
        ] as FieldDescription[],
      },
    });

    expect(wrapper.find('input').attributes('placeholder')).toBe(
      'Type your name',
    );
  });

  it('forwards required, label and the numeric/file props', () => {
    const received: Record<string, unknown>[] = [];
    const Probe = defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        received.push({ ...attrs });
        return () => h('input');
      },
    });
    fieldRegistry.register('text', Probe as never);

    mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [
          {
            name: 'n',
            type: 'text',
            label: 'N',
            required: true,
            min: 1,
            max: 9,
            step: 2,
            accept: '.png',
            multiple: true,
          },
        ] as FieldDescription[],
      },
    });

    expect(received[0]).toMatchObject({
      label: 'N',
      required: true,
      min: 1,
      max: 9,
      step: 2,
      accept: '.png',
      multiple: true,
    });
  });
});

describe('issue 5: form errors are the renderer source of truth (Vue)', () => {
  it('does not show a live error before the form store records it', async () => {
    const fields: FieldDescription[] = [
      {
        name: 'username',
        type: 'text',
        validate: () => 'Required',
      },
    ];
    const Form = defineComponent({
      setup() {
        const form = useDynamicForm({ fields });
        return () =>
          h('div', [
            h(MultiFieldInput, { fieldDescriptions: fields, form }),
            h(
              'button',
              { onClick: () => form.setFieldTouched('username') },
              'touch',
            ),
            h('button', { onClick: form.validate }, 'validate'),
          ]);
      },
    });
    const wrapper = mount(Form);

    await wrapper.findAll('button')[0].trigger('click');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.find('[role="alert"]').text()).toBe('Required');
  });
});

describe('issue 1, worst case: repeatable groups (Vue)', () => {
  it('gives every group item its own id for the same field name', () => {
    const wrapper = mount(MultiFieldInput, {
      props: {
        fieldDescriptions: [
          {
            name: 'contacts',
            type: 'text',
            label: 'Contacts',
            fields: [{ name: 'email', type: 'text', label: 'Email' }],
          },
        ] as FieldDescription[],
        properties: { contacts: [{ email: 'a' }, { email: 'b' }, {}] },
      },
    });

    const ids = wrapper.findAll('input').map((i) => i.attributes('id'));
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
