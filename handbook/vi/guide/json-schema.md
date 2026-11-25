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
| object lồng nhau                               | section, với giá trị mặc định của các thuộc tính làm giá trị mặc định của section                     |

`title` thành nhãn (nếu thiếu thì dùng dạng dễ đọc của tên thuộc tính), `description` thành mô tả, `readOnly` thành `readOnlyCondition`. `required`, `minLength`, `maxLength`, `pattern`, `minimum`, `maximum` và format `email` trở thành hook `validate` dựng từ `validators`, nên thông báo của chúng đi qua [bảng thông báo](./validation#thong-bao-validation) của form. `$ref` cục bộ (`#/...`), `allOf` và kiểu nullable (`type: ['string', 'null']`, hoặc `anyOf` có nhánh `null`) đều được lần theo.

Các từ khoá điều kiện trở thành [điều kiện dạng dữ liệu](./conditions): `dependentRequired` (và `dependencies` dạng mảng của draft-07) thành `requiredWhen`; một `if` kiểm tra `const`, `enum` hoặc sự có mặt (`required`) của thuộc tính, kết hợp bằng `allOf` / `anyOf` / `not`, thành `requiredWhen` cho các tên mà `then` / `else` liệt kê trong `required`, và `appearWhen` cho các thuộc tính mà chúng thêm vào. Một `if` nêu thuộc tính mà không liệt kê nó trong `required` được đọc như thể có liệt kê, vì form luôn có giá trị để so.

Những thứ không thành field và được báo trong `warnings`: object không có `properties`, tuple, mảng giá trị tự do, `$ref` từ xa, `exclusiveMinimum` / `exclusiveMaximum`. Cũng vậy với một `if` kiểm tra thứ khác (`minimum`, `pattern`...), một `then` thêm quy tắc cho thuộc tính lúc nào cũng có, và các từ khoá điều kiện khác (`dependentSchemas`); hãy diễn đạt chúng bằng `appearCondition` thông qua `overrides`.

`overrides` dùng khoá là đúng đường dẫn mà `warnings` dùng, và được trộn đè lên field sinh ra. Dùng nó để chọn `type` riêng của ứng dụng (`textarea`, một bộ chọn tuỳ biến), hoặc gắn các hook mà schema không diễn đạt được.

## Field từ tài liệu OpenAPI

`fieldsFromOpenApi` tìm schema trong một tài liệu OpenAPI 3.0 hoặc 3.1 và đọc nó theo cùng cách, với mọi `$ref` được lần theo trong cả tài liệu (`#/components/schemas/Pet`, `#/components/requestBodies/PetBody`, một path item trong `components.pathItems`). Truyền vào tài liệu đã parse (từ JSON, hoặc YAML qua thư viện YAML của bạn) và chỉ ra schema nào làm form:

```ts
import { fieldsFromOpenApi } from '@dynamic-field-kit/core';
import openapi from './openapi.json';

// Request body JSON của một operation, theo operationId...
const { fields, defaults, warnings } = fieldsFromOpenApi(openapi, {
  operationId: 'createPet',
});

// ...hoặc theo path template và method
fieldsFromOpenApi(openapi, { path: '/pets/{petId}', method: 'put' });

// ...hoặc lấy thẳng từ components.schemas
fieldsFromOpenApi(openapi, { schema: 'Pet' }, { keepReadOnly: true });
```

Kết quả vẫn là `{ fields, defaults, warnings }`, và `overrides` dùng như trên. Ngoài những gì `fieldsFromJsonSchema` đọc:

- Body là nội dung `application/json`, nếu không có thì là kiểu `+json` đầu tiên (`application/merge-patch+json`). `mediaType` chọn kiểu khác.
- Thuộc tính `readOnly` bị bỏ ra ngoài, vì server đặt giá trị cho chúng và request không mang chúng (`id`, `createdAt`). `keepReadOnly: true` giữ chúng thành field bị khoá, cho form hiển thị cả một resource.
- Đọc được cả hai phương ngữ: `nullable: true` và `nullable` đặt cạnh `allOf: [{ $ref }]` (3.0), mảng kiểu như `["string", "null"]` (3.1). Cận loại trừ, `exclusiveMinimum: true` (3.0) hay `exclusiveMinimum: 0` (3.1), được báo trong `warnings` như với JSON Schema.
- `format: uri` vẫn là field `text`, vì kit không có kiểu `url`; nếu ứng dụng của bạn tự định nghĩa kiểu đó (thêm vào `FieldTypeMap`), đặt `{ homepage: { type: 'url' } }` trong `overrides`.

Hàm ném lỗi, nêu rõ thứ nó tìm, khi operation, path, method hoặc schema không có trong tài liệu, khi operation không có request body hoặc không có body JSON, khi body không phải object có `properties` (ví dụ một mảng pet), và khi schema của body là `$ref` sang file khác. `$ref` ra ngoài tài liệu không được hỗ trợ: hãy gộp tài liệu thành một file trước (`redocly bundle`, `swagger-cli bundle`). Một `$ref` sang file khác nằm sâu hơn trong schema làm thuộc tính đó bị bỏ ra, kèm cảnh báo.

## JSON Schema từ field

`fieldsToJsonSchema` đi theo chiều ngược lại: nó mô tả dữ liệu mà một danh sách field thu thập, để làm hợp đồng API, validator phía server hoặc tài liệu.

```ts
import { fieldsToJsonSchema } from '@dynamic-field-kit/core';

const { schema, warnings } = fieldsToJsonSchema(fields, {
  title: 'Sign-up',
  defaults: { plan: 'free' },
  types: { rating: { type: 'integer', minimum: 1, maximum: 5 } },
  overrides: { username: { minLength: 3, pattern: '^[a-z]+$' } },
});
```

| Field                                                        | Schema                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `text`, `textarea`, `search`, `tel`, `color`, `hidden`       | `string`, với `maxLength` lấy từ `props.maxLength`                                                         |
| `email`, `url`, `password`, `date`, `time`, `datetime-local` | `string` với `format` tương ứng (`uri`, `date-time`)                                                       |
| `number`, `range`                                            | `number` với `minimum` / `maximum` / `multipleOf`; là `integer` khi step và minimum là số nguyên           |
| `checkbox`, `switch`                                         | `boolean`                                                                                                  |
| `select`, `radio`, hoặc field bất kỳ có `options` cố định    | `enum`, hoặc `oneOf` gồm `const` + `title` khi nhãn khác giá trị                                           |
| như trên, có `multiple`                                      | mảng các giá trị đó, với `uniqueItems`                                                                     |
| nhóm lặp lại (`fields`)                                      | mảng các object, với `minItems` / `maxItems` và giá trị của `defaultItem` làm `default`                    |
| section (`section`)                                          | object lồng nhau, có `properties` và `required` riêng; giá trị mặc định của nó chuyển xuống các thuộc tính |

`label` thành `title`, `description` dạng chuỗi thành mô tả, `required` vào danh sách `required`, và field có `computeValue` là `readOnly`. `defaults` nhận dữ liệu form và ghi nó thành `default`; `strict: true` thêm `additionalProperties: false`.

`requiredWhen` và `appearWhen` được ghi thành `if` / `then` trong `allOf` của object, và `fieldsFromJsonSchema` đọc lại đúng các điều kiện đó:

```json
{
  "type": "object",
  "properties": { "country": { "type": "string" }, "state": true },
  "allOf": [
    {
      "if": {
        "required": ["country"],
        "properties": { "country": { "enum": ["US", "CA"] } }
      },
      "then": { "properties": { "state": { "type": "string" } } }
    }
  ]
}
```

Field có `appearWhen` được định nghĩa dưới `then`, nên quy tắc của nó chỉ áp dụng khi nó hiện, còn `true` giữ chỗ của nó trong `properties` (và cho nó qua `strict`). Field bị ẩn không được validate, nên giá trị nào nó còn giữ cũng được chấp nhận. Điều kiện đọc gốc form (`root: true`) từ trong nhóm hoặc section không ghi được lên schema của object lồng nhau, và được báo trong `warnings`. Điều kiện dùng `notIn`, `gt`, `gte`, `lt`, `lte`, `contains` hoặc `notContains` cũng vậy, vì JSON Schema không diễn đạt được chúng với đúng nghĩa đó.

Schema không chứa được hàm, nên `validate`, `appearCondition`, `readOnlyCondition` và các hàm nạp lựa chọn được liệt kê trong `warnings` thay vì bị đoán; hãy đưa quy tắc mà chúng kiểm tra vào `overrides`, với khoá là cùng đường dẫn (`username`, `contacts[].phone`). Loại field mà kit không biết thì nhận mọi giá trị cho tới khi `types` mô tả nó, và field `file` bị bỏ ra ngoài.

Xem chạy thật: tab **JSON Schema + Undo** trong [demo React](https://vannt-dev.github.io/dynamic-field-kit/react/schema-form/), Vue, Angular và Svelte.
