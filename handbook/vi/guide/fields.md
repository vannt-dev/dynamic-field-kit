---
title: Mô tả field
---

# Mô tả field

## Ví dụ một schema

```ts
import type { FieldDescription } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'username', type: 'text', label: 'Username' },
  {
    name: 'age',
    type: 'number',
    label: 'Age',
    appearCondition: (data) => Boolean(data.username),
  },
];
```

## `FieldDescription`

```ts
export interface FieldDescription<T extends FieldTypeKey = FieldTypeKey> {
  name: string;
  type: T;
  // Pins this field's DOM id. Otherwise the id is the owning MultiFieldInput's
  // instance prefix plus `name`.
  id?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  // `rootData` is the top-level form data; `data` is this field's own level
  // (the group item when nested in a repeatable group).
  appearCondition?: (
    data: Record<string, any>,
    rootData?: Record<string, any>,
  ) => boolean;
  computeValue?: (
    data: Record<string, any>,
    rootData?: Record<string, any>,
  ) => unknown;
  options?: Record<string, any>[];
  className?: string;
  description?: any;
  // Extra props forwarded verbatim to the renderer (e.g. acceptFile, maxLength).
  props?: Record<string, any>;
  // Repeatable field group
  fields?: FieldDescription[];
  defaultItem?: Record<string, any>;
  // Item property used as the stable list key; falls back to the array index.
  keyField?: string;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  removeLabel?: string;
}
```

Các phần liên quan: [field dẫn xuất](./computed-fields) (`computeValue`), [validation và điều kiện](./validation) (`validate`, `appearCondition`, `disabledCondition`…), [nhóm lặp lại](./groups) (`fields`).

## `FieldRendererProps`

Đây là những gì một renderer nhận được:

```ts
export interface FieldRendererProps<T = any> {
  value?: T;
  onValueChange?: (value: T) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  touched?: boolean;
  dirty?: boolean;
  error?: string | string[];
  options?: Record<string, any>[];
  optionsStatus?: 'idle' | 'loading' | 'ready' | 'error';
  optionsError?: unknown;
  /** Not in FIELD_RENDERER_PROP_KEYS - a callback, like onValueChange. */
  onOptionsQuery?: (query: string) => void;
  className?: string;
  description?: any;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  accept?: string;
  multiple?: boolean;
}
```

Mỗi adapter đưa cho renderer cùng một bộ prop đầu vào, nhưng báo thay đổi theo cách quen thuộc của framework: React gọi prop `onValueChange`, Angular phát `EventEmitter` tên `valueChange` (hoặc `onValueChange`), còn Vue phát `update:value`.

### Hợp đồng được kiểm tra, không chỉ khai báo

Mọi prop ở trên đều tới được renderer trên **cả ba adapter**. Đó không phải quy ước suông: danh sách nằm trong core dưới tên `FIELD_RENDERER_PROP_KEYS`, bộ prop được dựng một lần bởi `buildFieldRendererProps`, mọi adapter đều gọi nó, và `scripts/check-renderer-prop-parity.js` làm hỏng build nếu một adapter ngừng chuyển một khoá qua ranh giới component của mình. Nhờ vậy renderer viết cho framework này chuyển được sang framework khác.

Còn một khác biệt có chủ ý, do ràng buộc của framework: **Vue nhận `className` dưới tên `class`**.

`ariaDescribedBy` bằng `makeErrorId(id)` — tức `` `${id}-error` `` — mỗi khi field có lỗi, và là `undefined` khi field hợp lệ (từ 1.7.0). Renderer dựng sẵn render một phần tử mang id đó. Renderer tuỳ biến có chuyển tiếp `aria-describedby` thì phải đặt `makeErrorId(id)` lên phần tử hiển thị thông báo lỗi, nếu không tham chiếu sẽ trỏ vào hư không.

```ts
import { buildFieldRendererProps, makeFieldId } from '@dynamic-field-kit/core';

// What every adapter's FieldInput does. Resolves disabled/readOnly/options,
// validates (skipping disabled fields), and sets the aria flags.
const props = buildFieldRendererProps({
  fieldDescription: field,
  data, // this field's own level
  rootData, // the top-level form
  id: makeFieldId(field, idPrefix),
  touched,
  dirty,
});
```

`makeFieldId(field, prefix)` trả về `field.id` nếu có, ngược lại là `` `${prefix}-${field.name}` ``. Các adapter truyền một prefix riêng cho từng thể hiện `MultiFieldInput`, nên hai form chứa field cùng tên không sinh ra id DOM trùng nhau.

## Các kiểu giá trị

```ts
// Any form-data object. `data` and `rootData` are always this.
export type Properties = Record<string, unknown>;

// What `validators.*` helpers return: one message, or undefined when valid.
export type ValidatorFn = (
  value: unknown,
  data?: Properties,
  rootData?: Properties,
) => string | undefined;

// What a `FieldDescription.validate` hook may return. The Promise arm is what
// makes a field async-only.
export type FieldValidatorResult =
  string | string[] | undefined | Promise<string | string[] | undefined>;

export type FieldValidatorFunction = (
  value: unknown,
  data: Properties,
  rootData?: Properties,
) => FieldValidatorResult;
```

Các schema adapter (`zodValidator` và các hàm tương tự) đều trả về một `FieldValidatorFunction`, nên kết quả của chúng đặt thẳng vào `validate` được.
