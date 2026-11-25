---
title: Điều kiện dạng dữ liệu
---

# Điều kiện dạng dữ liệu

`appearCondition` là một hàm, nên danh sách field dùng nó không lưu được thành JSON, không gửi được từ server và không ghi được vào JSON Schema. `appearWhen` và `requiredWhen` nhận cùng loại quy tắc đó nhưng dưới dạng dữ liệu thuần (`disabledWhen` và `readOnlyWhen` cũng vậy, xem bên dưới):

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
| `{ field, notIn: [a, b] }`                    | có giá trị, và giá trị đó không bằng phần tử nào trong danh sách                          |
| `{ field, gt: n }`, `gte`, `lt`, `lte`        | giá trị là số lớn hơn `n` / từ `n` trở lên / nhỏ hơn `n` / không quá `n`                  |
| `{ field, contains: x }`                      | chuỗi có chứa `x` (phân biệt hoa thường), hoặc mảng có phần tử `x`                        |
| `{ field, notContains: x }`                   | giá trị là chuỗi hoặc mảng, và không chứa `x`                                             |
| `{ field, truthy: true }` / `false`           | giá trị truthy / falsy theo JavaScript                                                    |
| `{ field, empty: true }` / `false`            | giá trị rỗng / không rỗng: undefined, `null`, `''` hoặc `[]`, như `validators.required`   |
| `{ all: [...] }`, `{ any: [...] }`, `{ not }` | mọi điều kiện, ít nhất một điều kiện, hoặc phủ định (`all: []` là đúng, `any: []` là sai) |

`field` chỉ một giá trị ở đúng cấp của field: phần tử trong nhóm lặp lại, object của section khi nằm trong section. Đường dẫn có dấu chấm đọc sâu hơn (`address.country`), còn `root: true` đọc dữ liệu cấp cao nhất của form, giống `rootData` của một hàm: `{ field: 'plan', equals: 'pro', root: true }`.

`gt`, `gte`, `lt` và `lte` chỉ so sánh số. Chuỗi là số (`'18'`, như ô nhập văn bản lưu lại) được tính là số đó ở cả hai vế, nên `{ field: 'age', gte: 18 }` và `{ field: 'age', gte: '18' }` cho cùng kết quả. Mọi thứ khác, như `''`, `true`, mảng hay chuỗi ngày tháng, không phải là số và không bao giờ khớp; ngày tháng không được so sánh. `contains` trên mảng so phần tử theo giá trị, như `equals`.

`notIn`, `gt`, `gte`, `lt`, `lte`, `contains` và `notContains` đều không khớp khi giá trị là undefined hoặc `null`: field chưa ai điền thì không lớn hơn cũng không nhỏ hơn giới hạn nào. Điểm này khác `notEquals`, vốn đúng với giá trị không có. Khi muốn giá trị không có cũng được tính, hãy viết `{ not: { field: 'tags', contains: 'x' } }`.

- **`appearWhen`** ẩn field khi điều kiện sai. Field bị ẩn không được render, không được validate và không có trong `collectFieldPaths`, đúng như với `appearCondition`. Nếu một field có cả hai thì **`appearCondition` thắng** và `appearWhen` bị bỏ qua, nên một hàm truyền qua `overrides` sẽ thay cho quy tắc đã lưu.
- **`requiredWhen`** làm field bắt buộc khi điều kiện đúng: renderer nhận `required: true` (và `ariaRequired`), còn validation báo thông báo `required` lấy từ [bảng thông báo](./validation#thong-bao-validation) của form khi giá trị rỗng. Khi đã có giá trị, `validate` của field chạy như thường. **`required: true` thắng** `requiredWhen`: field đánh dấu `required` vẫn dựa vào hook `validate` của nó (`validators.required()`) như trước giờ.
- **`disabledWhen`** và **`readOnlyWhen`** là `disabledCondition` và `readOnlyCondition` viết dưới dạng dữ liệu: renderer nhận `disabled` hoặc `readOnly` khi điều kiện đúng. `disabled: true` vẫn vô hiệu hoá field, và khi có cả hai thì hàm thắng quy tắc. Field bị vô hiệu hoá (hoặc section hay nhóm bị vô hiệu hoá qua `disabledWhen` đặt trên nó) không được validate. JSON Schema không diễn đạt được hai khoá này, nên `fieldsToJsonSchema` cảnh báo và bỏ chúng ra.

Điều kiện không thuộc các dạng trên được coi là sai, kèm cảnh báo khi chạy ở chế độ development. `evaluateCondition(condition, data, rootData?)`, `resolveVisible` và `resolveRequired` được export để dùng ngoài form. Mọi adapter đọc hai khoá này qua `resolveVisible` của core, nên adapter từ bản phát hành có tính năng này cần core từ cùng bản đó trở lên.

## Với JSON Schema

`fieldsToJsonSchema` ghi cả hai thành `if` / `then` trong `allOf` của object, và `fieldsFromJsonSchema` đọc lại đúng các điều kiện đó. Field có `appearWhen` được định nghĩa dưới `then`, nên quy tắc của nó chỉ áp dụng khi nó hiện; `true` giữ chỗ của nó trong `properties` (và cho nó qua `strict`). Điều kiện đọc gốc form (`root: true`) từ trong nhóm hoặc section không ghi được lên schema của object lồng nhau, nên được báo trong `warnings`. Điều kiện dùng `notIn`, `gt`, `gte`, `lt`, `lte`, `contains` hoặc `notContains` cũng vậy: JSON Schema không có từ khoá nào mang đúng nghĩa đó (chẳng hạn `minimum` vẫn đúng với giá trị không phải là số), nên chúng không được ghi vào schema.

Chiều ngược lại, `fieldsFromJsonSchema` đọc:

| Schema                                                                                 | Field                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `dependentRequired: { card: ['cvc'] }` (hoặc `dependencies` của draft-07)              | `cvc` có `requiredWhen: { field: 'card', empty: false }`            |
| `if: { properties: { country: { const: 'US' } } }, then: { required: ['state'] }`      | `state` có `requiredWhen: { field: 'country', equals: 'US' }`       |
| như trên, thêm `else: { required: ['postcode'] }`                                      | `postcode` có `requiredWhen: { field: 'country', notEquals: 'US' }` |
| `then: { properties: { vat: { type: 'string' } } }`, `vat` không có trong `properties` | field `vat` với `appearWhen` là điều kiện của `if`                  |

Xem thêm [Field từ JSON Schema](./json-schema).
