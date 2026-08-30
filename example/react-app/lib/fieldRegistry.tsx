'use client';

import { fieldRegistry } from '@dynamic-field-kit/react';
import type { CSSProperties } from 'react';

const inputStyle: CSSProperties = {
  padding: '8px',
  marginBottom: '4px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
};

fieldRegistry.register(
  'text',
  ({
    value,
    onValueChange,
    label,
    disabled,
    readOnly,
    error,
    onBlur,
    placeholder,
  }) => (
    <label style={{ display: 'block', marginBottom: '12px' }}>
      {label && (
        <span
          style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}
        >
          {label}
        </span>
      )}
      <input
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        style={{
          ...inputStyle,
          backgroundColor: disabled ? '#f0f0f0' : readOnly ? '#fafafa' : '#fff',
          borderColor: error ? '#ef4444' : '#ccc',
        }}
        onChange={(e) => onValueChange?.(e.target.value)}
        onBlur={onBlur}
      />
      {error && (
        <span style={{ color: '#ef4444', fontSize: '12px', display: 'block' }}>
          {Array.isArray(error) ? error.join(', ') : error}
        </span>
      )}
    </label>
  ),
);

fieldRegistry.register(
  'number',
  ({ value, onValueChange, label, disabled, readOnly, error, onBlur }) => (
    <label style={{ display: 'block', marginBottom: '12px' }}>
      {label && (
        <span
          style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}
        >
          {label}
        </span>
      )}
      <input
        type="number"
        value={value ?? ''}
        disabled={disabled}
        readOnly={readOnly}
        style={{
          ...inputStyle,
          backgroundColor: disabled ? '#f0f0f0' : readOnly ? '#fafafa' : '#fff',
          borderColor: error ? '#ef4444' : '#ccc',
        }}
        onChange={(e) =>
          onValueChange?.(
            e.target.value === '' ? ('' as any) : Number(e.target.value),
          )
        }
        onBlur={onBlur}
      />
      {error && (
        <span style={{ color: '#ef4444', fontSize: '12px', display: 'block' }}>
          {Array.isArray(error) ? error.join(', ') : error}
        </span>
      )}
    </label>
  ),
);

fieldRegistry.register(
  'select',
  ({
    value,
    onValueChange,
    label,
    options,
    disabled,
    readOnly,
    error,
    onBlur,
  }) => (
    <label style={{ display: 'block', marginBottom: '12px' }}>
      {label && (
        <span
          style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}
        >
          {label}
        </span>
      )}
      <select
        value={value ?? ''}
        disabled={disabled || readOnly}
        style={{
          ...inputStyle,
          backgroundColor: disabled ? '#f0f0f0' : '#fff',
          borderColor: error ? '#ef4444' : '#ccc',
        }}
        onChange={(e) => onValueChange?.(e.target.value)}
        onBlur={onBlur}
      >
        <option value="">-- Chọn --</option>
        {(options || []).map((opt: any) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt.value ?? opt}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ color: '#ef4444', fontSize: '12px', display: 'block' }}>
          {Array.isArray(error) ? error.join(', ') : error}
        </span>
      )}
    </label>
  ),
);

export {};
