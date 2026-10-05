---
title: Field từ JSON Schema
---

# Field từ JSON Schema

`fieldsFromJsonSchema` biến một object JSON Schema thành danh sách field, nên form có thể chạy theo chính schema mà API đã công bố (ví dụ một mục trong `components.schemas` của OpenAPI).

```ts
import { fieldsFromJsonSchema } from '@dynamic-field-kit/core';

const { fields, defaults, warnings } = fieldsFromJsonSchema(
  {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email' },
      age: { type: 'integer', minimum: 18 },
      plan: { enum: ['free', 'pro'], default: 'free' },
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: { phone: { type: 'string' } },
        },
      },
    },
  },
  { overrides: { 'contacts[].phone': { placeholder: '+84…' } } },
);
```

- `fields` đưa vào `MultiFieldInput` / `useDynamicForm` như một danh sách viết tay.
- `defaults` chứa các giá trị `default` của schema, có hình dạng giống dữ liệu form. Hãy truyền nó làm dữ liệu ban đầu.
- `warnings` liệt kê mọi thuộc tính hoặc từ khoá không vào được form, kèm đường dẫn. Không có gì bị bỏ qua âm thầm.

| Schema                                         | Field                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `string`                                       | `text`; `format` chọn `email`, `date`, `time`, `datetime-local` (`date-time`) hoặc `password`         |
| `number`, `integer`                            | `number`, với `min` / `max` từ `minimum` / `maximum` và `step` từ `multipleOf` (bằng 1 với `integer`) |
| `boolean`                                      | `checkbox`                                                                                            |
| `enum`, hoặc `oneOf` / `anyOf` chỉ gồm `const` | `select`; `title` của một thành viên `const` là nhãn của lựa chọn                                     |
| mảng các enum                                  | `select` có `multiple`                                                                                |
| mảng các object                                | nhóm lặp lại, với `minItems` / `maxItems` và `defaultItem` lấy từ giá trị mặc định của phần tử        |

`title` thành nhãn (nếu thiếu thì dùng dạng dễ đọc của tên thuộc tính), `description` thành mô tả, `readOnly` thành `readOnlyCondition`. `required`, `minLength`, `maxLength`, `pattern`, `minimum`, `maximum` và format `email` trở thành hook `validate` dựng từ `validators`, nên thông báo của chúng đi qua [bảng thông báo](./validation#thong-bao-validation) của form. `$ref` cục bộ (`#/...`), `allOf` và kiểu nullable (`type: ['string', 'null']`, hoặc `anyOf` có nhánh `null`) đều được lần theo.

Những thứ không thành field và được báo trong `warnings`: object lồng nhau, tuple, mảng giá trị tự do, `$ref` từ xa, `exclusiveMinimum` / `exclusiveMaximum`. Các từ khoá điều kiện (`if` / `then`, `dependentRequired`) bị bỏ qua; hãy diễn đạt chúng bằng `appearCondition` thông qua `overrides`.

`overrides` dùng khoá là đúng đường dẫn mà `warnings` dùng, và được trộn đè lên field sinh ra. Dùng nó để chọn `type` riêng của ứng dụng (`textarea`, một bộ chọn tuỳ biến), hoặc gắn các hook mà schema không diễn đạt được.

Xem chạy thật: tab **JSON Schema + Undo** trong [demo React](https://vannt-dev.github.io/dynamic-field-kit/react/schema-form/), Vue và Angular.
