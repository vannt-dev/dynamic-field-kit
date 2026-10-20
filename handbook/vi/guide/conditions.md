---
title: Điều kiện dạng dữ liệu
---

# Điều kiện dạng dữ liệu

`appearCondition` là một hàm, nên danh sách field dùng nó không lưu được thành JSON, không gửi được từ server và không ghi được vào JSON Schema. `appearWhen` và `requiredWhen` nhận cùng loại quy tắc đó nhưng dưới dạng dữ liệu thuần:

```ts
import type { FieldDescription } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'country', type: 'select', options: countries },
  {
    name: 'state',
    type: 'text',
    appearWhen: { field: 'country', in: ['US', 'CA'] },
    requiredWhen: { field: 'country', equals: 'US' },
  },
  {
    name: 'vat',
    type: 'text',
    appearWhen: {
      all: [
        { field: 'accountType', equals: 'business' },
        { not: { field: 'country', equals: 'US' } },
      ],
    },
  },
];

// Cùng danh sách đó, đọc lại từ nơi lưu trữ, vẫn chạy y như cũ.
const stored = JSON.parse(JSON.stringify(fields));
```

| Điều kiện                                     | Đúng khi                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `{ field, equals: value }`                    | giá trị bằng `value`; mảng và object so theo giá trị, như JSON Schema                     |
| `{ field, notEquals: value }`                 | giá trị khác `value` (giá trị không có thì không bằng gì cả)                              |
| `{ field, in: [a, b] }`                       | giá trị bằng một phần tử trong danh sách                                                  |
| `{ field, truthy: true }` / `false`           | giá trị truthy / falsy theo JavaScript                                                    |
| `{ field, empty: true }` / `false`            | giá trị rỗng / không rỗng: undefined, `null`, `''` hoặc `[]`, như `validators.required`   |
| `{ all: [...] }`, `{ any: [...] }`, `{ not }` | mọi điều kiện, ít nhất một điều kiện, hoặc phủ định (`all: []` là đúng, `any: []` là sai) |

`field` chỉ một giá trị ở đúng cấp của field: phần tử trong nhóm lặp lại, object của section khi nằm trong section. Đường dẫn có dấu chấm đọc sâu hơn (`address.country`), còn `root: true` đọc dữ liệu cấp cao nhất của form, giống `rootData` của một hàm: `{ field: 'plan', equals: 'pro', root: true }`.

- **`appearWhen`** ẩn field khi điều kiện sai. Field bị ẩn không được render, không được validate và không có trong `collectFieldPaths`, đúng như với `appearCondition`. Nếu một field có cả hai thì **`appearCondition` thắng** và `appearWhen` bị bỏ qua, nên một hàm truyền qua `overrides` sẽ thay cho quy tắc đã lưu.
- **`requiredWhen`** làm field bắt buộc khi điều kiện đúng: renderer nhận `required: true` (và `ariaRequired`), còn validation báo thông báo `required` lấy từ [bảng thông báo](./validation#thong-bao-validation) của form khi giá trị rỗng. Khi đã có giá trị, `validate` của field chạy như thường. **`required: true` thắng** `requiredWhen`: field đánh dấu `required` vẫn dựa vào hook `validate` của nó (`validators.required()`) như trước giờ.

Điều kiện không thuộc các dạng trên được coi là sai, kèm cảnh báo khi chạy ở chế độ development. `evaluateCondition(condition, data, rootData?)`, `resolveVisible` và `resolveRequired` được export để dùng ngoài form. Mọi adapter đọc hai khoá này qua `resolveVisible` của core, nên adapter từ bản phát hành có tính năng này cần core từ cùng bản đó trở lên.

## Với JSON Schema

`fieldsToJsonSchema` ghi cả hai thành `if` / `then` trong `allOf` của object, và `fieldsFromJsonSchema` đọc lại đúng các điều kiện đó. Field có `appearWhen` được định nghĩa dưới `then`, nên quy tắc của nó chỉ áp dụng khi nó hiện; `true` giữ chỗ của nó trong `properties` (và cho nó qua `strict`). Điều kiện đọc gốc form (`root: true`) từ trong nhóm hoặc section không ghi được lên schema của object lồng nhau, nên được báo trong `warnings`.

Chiều ngược lại, `fieldsFromJsonSchema` đọc:

| Schema                                                                                 | Field                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `dependentRequired: { card: ['cvc'] }` (hoặc `dependencies` của draft-07)              | `cvc` có `requiredWhen: { field: 'card', empty: false }`            |
| `if: { properties: { country: { const: 'US' } } }, then: { required: ['state'] }`      | `state` có `requiredWhen: { field: 'country', equals: 'US' }`       |
| như trên, thêm `else: { required: ['postcode'] }`                                      | `postcode` có `requiredWhen: { field: 'country', notEquals: 'US' }` |
| `then: { properties: { vat: { type: 'string' } } }`, `vat` không có trong `properties` | field `vat` với `appearWhen` là điều kiện của `if`                  |

Xem thêm [Field từ JSON Schema](./json-schema).
