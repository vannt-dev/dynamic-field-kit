'use client';

import { fieldRegistry } from '@dynamic-field-kit/react';
import type { CSSProperties } from 'react';

const inputStyle: CSSProperties = {
  padding: '8px',
  marginBottom: '8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
};

fieldRegistry.register('text', ({ value, onValueChange, label }) => (
  <label style={{ display: 'block' }}>
    {label && <span>{label}</span>}
    <input
      value={value ?? ''}
      style={inputStyle}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </label>
));

fieldRegistry.register('number', ({ value, onValueChange, label }) => (
  <label style={{ display: 'block' }}>
    {label && <span>{label}</span>}
    <input
      type="number"
      style={inputStyle}
      value={value ?? ''}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
    />
  </label>
));

export {};
