import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import { defineComponent, h, PropType, ref } from 'vue';

export const DynamicFormDevTools = defineComponent({
  name: 'DynamicFormDevTools',
  props: {
    data: {
      type: Object as PropType<Properties>,
      required: true,
    },
    errors: {
      type: Object as PropType<Record<string, string[]>>,
      default: () => ({}),
    },
    touched: {
      type: Object as PropType<Record<string, boolean>>,
      default: () => ({}),
    },
    isDirty: {
      type: Boolean,
      default: false,
    },
    fields: {
      type: Array as PropType<FieldDescription[]>,
      default: () => [],
    },
    position: {
      type: String as PropType<'bottom-right' | 'bottom-left'>,
      default: 'bottom-right',
    },
  },
  setup(props) {
    const isOpen = ref(false);
    const activeTab = ref<'data' | 'errors' | 'meta' | 'fields'>('data');

    return () => {
      const errorKeys = Object.keys(props.errors || {});
      const errorCount = errorKeys.length;

      const posStyle =
        props.position === 'bottom-left'
          ? { left: '16px', bottom: '16px' }
          : { right: '16px', bottom: '16px' };

      if (!isOpen.value) {
        return h(
          'button',
          {
            type: 'button',
            onClick: () => (isOpen.value = true),
            style: {
              position: 'fixed',
              ...posStyle,
              zIndex: 99999,
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '20px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            },
          },
          [
            h('span', '🔍 DevTools'),
            errorCount > 0
              ? h(
                  'span',
                  {
                    style: {
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '2px 6px',
                      fontSize: '10px',
                    },
                  },
                  String(errorCount)
                )
              : null,
          ]
        );
      }

      return h(
        'div',
        {
          style: {
            position: 'fixed',
            ...posStyle,
            zIndex: 99999,
            width: '360px',
            maxHeight: '420px',
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace, sans-serif',
            fontSize: '12px',
            overflow: 'hidden',
          },
        },
        [
          // Header
          h(
            'div',
            {
              style: {
                padding: '10px 14px',
                background: '#1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #334155',
              },
            },
            [
              h(
                'span',
                { style: { fontWeight: 'bold', color: '#38bdf8' } },
                '🛠️ Form DevTools'
              ),
              h(
                'button',
                {
                  type: 'button',
                  onClick: () => (isOpen.value = false),
                  style: {
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer',
                  },
                },
                '✕'
              ),
            ]
          ),
          // Tabs
          h(
            'div',
            {
              style: {
                display: 'flex',
                background: '#1e293b',
                borderBottom: '1px solid #334155',
              },
            },
            (['data', 'errors', 'meta', 'fields'] as const).map((tab) =>
              h(
                'button',
                {
                  key: tab,
                  type: 'button',
                  onClick: () => (activeTab.value = tab),
                  style: {
                    flex: 1,
                    padding: '6px 0',
                    background:
                      activeTab.value === tab ? '#0f172a' : 'transparent',
                    color: activeTab.value === tab ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontSize: '11px',
                    fontWeight: activeTab.value === tab ? 'bold' : 'normal',
                  },
                },
                `${tab}${
                  tab === 'errors' && errorCount > 0 ? ` (${errorCount})` : ''
                }`
              )
            )
          ),
          // Content
          h('div', { style: { padding: '12px', overflowY: 'auto', flex: 1 } }, [
            activeTab.value === 'data'
              ? h(
                  'pre',
                  {
                    style: {
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: '#a7f3d0',
                    },
                  },
                  JSON.stringify(props.data, null, 2)
                )
              : null,
            activeTab.value === 'errors'
              ? h(
                  'div',
                  errorCount === 0
                    ? [
                        h(
                          'span',
                          { style: { color: '#4ade80' } },
                          '✓ No validation errors'
                        ),
                      ]
                    : Object.entries(props.errors).map(([field, msgs]) =>
                        h(
                          'div',
                          { key: field, style: { marginBottom: '8px' } },
                          [
                            h(
                              'span',
                              {
                                style: { color: '#f87171', fontWeight: 'bold' },
                              },
                              `${field}:`
                            ),
                            h(
                              'ul',
                              { style: { margin: '4px 0 0 16px', padding: 0 } },
                              msgs.map((m, i) =>
                                h(
                                  'li',
                                  { key: i, style: { color: '#fca5a5' } },
                                  m
                                )
                              )
                            ),
                          ]
                        )
                      )
                )
              : null,
            activeTab.value === 'meta'
              ? h('div', [
                  h('div', { style: { marginBottom: '6px' } }, [
                    h('span', { style: { color: '#94a3b8' } }, 'isDirty: '),
                    h(
                      'span',
                      {
                        style: { color: props.isDirty ? '#facc15' : '#4ade80' },
                      },
                      String(props.isDirty)
                    ),
                  ]),
                  h('div', [
                    h(
                      'span',
                      { style: { color: '#94a3b8' } },
                      'Touched Fields:'
                    ),
                    h(
                      'pre',
                      { style: { margin: '4px 0 0 0', color: '#cbd5e1' } },
                      JSON.stringify(props.touched, null, 2)
                    ),
                  ]),
                ])
              : null,
            activeTab.value === 'fields'
              ? h(
                  'div',
                  props.fields.length === 0
                    ? [
                        h(
                          'span',
                          { style: { color: '#94a3b8' } },
                          'No field descriptions passed'
                        ),
                      ]
                    : props.fields.map((f) =>
                        h(
                          'div',
                          {
                            key: f.name,
                            style: {
                              padding: '6px',
                              marginBottom: '6px',
                              background: '#1e293b',
                              borderRadius: '4px',
                            },
                          },
                          [
                            h(
                              'div',
                              {
                                style: { color: '#38bdf8', fontWeight: 'bold' },
                              },
                              f.name
                            ),
                            h(
                              'div',
                              { style: { color: '#94a3b8', fontSize: '10px' } },
                              `type: ${f.type} | required: ${String(
                                Boolean(f.required)
                              )}`
                            ),
                          ]
                        )
                      )
                )
              : null,
          ]),
        ]
      );
    };
  },
});
