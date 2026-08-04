'use client';

import {
  FieldDescription,
  validators,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';
import { MultiFieldInput } from '@dynamic-field-kit/react';
import Link from 'next/link';
import { useState } from 'react';
import '../../lib/fieldRegistry';

const fields: FieldDescription[] = [
  {
    name: 'country',
    type: 'select',
    label: '1. Quốc gia (Dynamic Options)',
    options: [
      { label: 'Việt Nam', value: 'VN' },
      { label: 'Hoa Kỳ (USA)', value: 'US' },
    ],
    validate: validators.required('Vui lòng chọn quốc gia'),
  },
  {
    name: 'city',
    type: 'select',
    label: '2. Thành phố (Phụ thuộc vào Quốc gia đã chọn)',
    // Dynamic options function evaluated on data change
    options: (data) => {
      if (data.country === 'VN') {
        return [
          { label: 'Hà Nội', value: 'HN' },
          { label: 'TP. Hồ Chí Minh', value: 'HCM' },
          { label: 'Đà Nẵng', value: 'DN' },
        ];
      }
      if (data.country === 'US') {
        return [
          { label: 'New York', value: 'NY' },
          { label: 'Los Angeles', value: 'LA' },
          { label: 'Chicago', value: 'CHI' },
        ];
      }
      return [];
    },
    disabledCondition: (data) => !data.country,
    validate: validators.required('Vui lòng chọn thành phố'),
  },
  {
    name: 'email',
    type: 'text',
    label: '3. Email (Built-in Validators: required + email)',
    placeholder: 'example@domain.com',
    validate: validators.compose(
      validators.required('Email bắt buộc'),
      validators.email('Định dạng email không hợp lệ')
    ),
  },
  {
    name: 'username',
    type: 'text',
    label: '4. Username (Async validation simulation)',
    placeholder: 'Nhập username (thử "admin")',
    validate: async (value) => {
      if (!value) {
        return 'Username bắt buộc';
      }
      // Simulate API call check
      if (String(value).toLowerCase() === 'admin') {
        return 'Tên "admin" đã tồn tại, vui lòng chọn tên khác';
      }
      return undefined;
    },
  },
  {
    name: 'enableExtra',
    type: 'select',
    label: '5. Hiển thị trường bổ sung? (appearCondition)',
    options: [
      { label: 'Không', value: 'no' },
      { label: 'Có', value: 'yes' },
    ],
  },
  {
    name: 'note',
    type: 'text',
    label: 'Ghi chú thêm (Xuất hiện khi chọn "Có")',
    appearCondition: (data) => data.enableExtra === 'yes',
  },
  {
    name: 'lockAll',
    type: 'select',
    label: '6. Khóa trường số điện thoại? (disabledCondition)',
    options: [
      { label: 'Mở khóa', value: 'unlocked' },
      { label: 'Khóa (Disabled)', value: 'locked' },
    ],
  },
  {
    name: 'phone',
    type: 'text',
    label: 'Số điện thoại',
    placeholder: '0901234567',
    disabledCondition: (data) => data.lockAll === 'locked',
  },
];

export default function NewFeaturesPage() {
  const [data, setData] = useState<Record<string, any>>({ country: 'VN' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    // Test async validation
    const res = await validateFieldsAsync(fields, data);
    setErrors(res.errors);
    setValidating(false);
  };

  return (
    <main
      style={{
        padding: '24px',
        maxWidth: '700px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
      }}
    >
      <nav
        style={{
          marginBottom: '20px',
          padding: '12px',
          background: '#f0f4f8',
          borderRadius: '8px',
        }}
      >
        <Link
          href="/"
          style={{
            marginRight: '16px',
            fontWeight: 'normal',
            color: '#0066cc',
            textDecoration: 'none',
          }}
        >
          ← Demo Cơ Bản (Legacy)
        </Link>
        <strong style={{ color: '#111' }}>✨ Demo Tính Năng Mới (v1.3+)</strong>
      </nav>

      <h1 style={{ marginBottom: '12px', fontSize: '24px' }}>
        Tính Năng Mới v1.3+ Engine
      </h1>
      <p style={{ color: '#666', marginBottom: '24px', lineHeight: 1.5 }}>
        Trang này minh họa các tính năng mới gồm: Built-in validators
        (`required`, `email`, `compose`), Dynamic Options (Options thay đổi theo
        Quốc gia), Conditional Disabled & Appear, và Async Validation.
      </p>

      <MultiFieldInput
        fieldDescriptions={fields}
        properties={data}
        onChange={setData}
        onValidityChange={(res) => setErrors(res.errors)}
        layout={{
          type: 'responsive',
          mobile: 'column',
          desktop: { type: 'grid', columns: 2, gap: 16 },
        }}
      />

      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleValidate}
          disabled={validating}
          style={{
            padding: '10px 16px',
            backgroundColor: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {validating ? 'Đang kiểm tra...' : 'Kiểm tra lỗi (Validate Fields)'}
        </button>
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
          Current State (Data):
        </h3>
        <pre style={{ margin: 0, fontSize: '13px' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
        {Object.keys(errors).length > 0 && (
          <>
            <h3
              style={{
                margin: '16px 0 8px 0',
                fontSize: '16px',
                color: '#ef4444',
              }}
            >
              Validation Errors:
            </h3>
            <pre style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>
              {JSON.stringify(errors, null, 2)}
            </pre>
          </>
        )}
      </div>
    </main>
  );
}
