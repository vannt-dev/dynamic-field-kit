---
title: Lỗi từ server
---

# Lỗi từ server

`serverErrorsFrom(body, options?)` biến câu trả lời của một backend vừa từ chối lần submit thành lỗi theo đường dẫn field, sẵn sàng đưa vào `setServerErrors` của form store:

```ts
import {
  collectFieldPaths,
  FORM_ERROR_KEY,
  serverErrorsFrom,
} from '@dynamic-field-kit/core';

serverErrorsFrom(
  { errors: { Email: ['Already registered'] } },
  { paths: collectFieldPaths(fields, data) },
);
// { email: ['Already registered'] }

serverErrorsFrom({
  errors: [
    { pointer: '/contacts/1/phone', detail: 'Not a phone number' },
    { message: 'The order is closed' },
  ],
});
// { 'contacts[1].phone': ['Not a phone number'], [FORM_ERROR_KEY]: ['The order is closed'] }
```

Hàm đọc được ba dạng: một map từ field tới một hoặc nhiều thông báo; map đó nằm dưới `errors` hoặc `fieldErrors` (với `formErrors` bên cạnh); và một danh sách dưới `errors` hoặc `issues` mà mỗi phần tử gọi tên field của nó bằng `field`, `path`, `name`, `property`, `param`, `pointer` hoặc `source.pointer` và mang một `message`, `detail`, `msg` hoặc `constraints`. JSON Pointer, đường dẫn có dấu chấm, JSONPath và danh sách các đoạn đều trở thành dạng đường dẫn mà thư viện dùng (`contacts[1].phone`). Khi có `paths`, một key chỉ khác một field của form ở chữ hoa hay chữ thường sẽ lấy cách viết của field đó. Lỗi không gọi tên field nào được giữ dưới `FORM_ERROR_KEY`. Một body không phải là tập lỗi theo field cho ra một object rỗng.
