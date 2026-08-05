'use client';

import { FieldDescription } from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/react';
import { useState } from 'react';
import '../lib/fieldRegistry';

const fields: FieldDescription[] = [
  { name: 'firstName', type: 'text', label: 'First Name' },
  { name: 'lastName', type: 'text', label: 'Last Name' },
  {
    name: 'fullName',
    type: 'text',
    label: 'Full Name (computed)',
    // Derived from the two fields above whenever either one changes.
    computeValue: (data) =>
      `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
  { name: 'age', type: 'number', label: 'Age' },
  {
    name: 'contacts',
    type: 'group',
    label: 'Contacts',
    // Repeatable field group: data.contacts becomes an array of items shaped
    // by these sub-fields, with Add/Remove controls rendered automatically.
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' },
    minItems: 0,
    maxItems: 5,
  },
];

export default function BasicsDemo() {
  const [data, setData] = useState({});

  return (
    <>
      <MultiFieldInput
        fieldDescriptions={fields}
        properties={data}
        onChange={setData}
        layout={{
          type: 'responsive',
          mobile: 'column',
          desktop: { type: 'grid', columns: 2, gap: 16 },
        }}
      />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
