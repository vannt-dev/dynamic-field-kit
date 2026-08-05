import { FieldDescription, Properties } from '@dynamic-field-kit/core';
import React, { useState } from 'react';

export interface DynamicFormDevToolsProps {
  data: Properties;
  errors?: Record<string, string[]>;
  touched?: Record<string, boolean>;
  isDirty?: boolean;
  fields?: FieldDescription[];
  position?: 'bottom-right' | 'bottom-left';
}

export const DynamicFormDevTools: React.FC<DynamicFormDevToolsProps> = ({
  data,
  errors = {},
  touched = {},
  isDirty = false,
  fields = [],
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'data' | 'errors' | 'meta' | 'fields'
  >('data');

  const errorCount = Object.keys(errors).length;

  const posStyle: React.CSSProperties =
    position === 'bottom-left'
      ? { left: '16px', bottom: '16px' }
      : { right: '16px', bottom: '16px' };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
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
        }}
      >
        <span>🔍 DevTools</span>
        {errorCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '10px',
            }}
          >
            {errorCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
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
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          background: '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155',
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>
          🛠️ Form DevTools
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        {(['data', 'errors', 'meta', 'fields'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '6px 0',
              background: activeTab === tab ? '#0f172a' : 'transparent',
              color: activeTab === tab ? '#38bdf8' : '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontSize: '11px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
            }}
          >
            {tab} {tab === 'errors' && errorCount > 0 ? `(${errorCount})` : ''}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
        {activeTab === 'data' && (
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: '#a7f3d0',
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        )}

        {activeTab === 'errors' && (
          <div>
            {Object.keys(errors).length === 0 ? (
              <span style={{ color: '#4ade80' }}>✓ No validation errors</span>
            ) : (
              Object.entries(errors).map(([field, msgs]) => (
                <div key={field} style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                    {field}:
                  </span>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {msgs.map((m, i) => (
                      <li key={i} style={{ color: '#fca5a5' }}>
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'meta' && (
          <div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ color: '#94a3b8' }}>isDirty: </span>
              <span style={{ color: isDirty ? '#facc15' : '#4ade80' }}>
                {String(isDirty)}
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Touched Fields:</span>
              <pre style={{ margin: '4px 0 0 0', color: '#cbd5e1' }}>
                {JSON.stringify(touched, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'fields' && (
          <div>
            {fields.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>
                No field descriptions passed
              </span>
            ) : (
              fields.map((f) => (
                <div
                  key={f.name}
                  style={{
                    padding: '6px',
                    marginBottom: '6px',
                    background: '#1e293b',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                    {f.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                    type: {f.type} | required: {String(Boolean(f.required))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
