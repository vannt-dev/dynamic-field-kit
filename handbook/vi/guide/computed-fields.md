---
title: Field dẫn xuất
---

# Field dẫn xuất

`computeValue` tính giá trị của một field từ phần còn lại của dữ liệu form (ví dụ `fullName` tính từ `firstName` + `lastName`). Hàm được gọi dạng `(data, rootData)` — `rootData` là form ở cấp cao nhất, kể cả khi field nằm trong một nhóm.

`MultiFieldInput` của mọi adapter tính lại nó một lần cho mỗi thay đổi, trên dữ liệu sau thay đổi. Nó không chạy lặp cho tới khi ổn định, nên:

- tránh nối các field `computeValue` thành vòng lặp;
- trả về giá trị nguyên thuỷ hoặc một tham chiếu ổn định (trả về object/mảng mới ở mỗi lần gọi sẽ vô hiệu hoá tối ưu bỏ qua render).

Ở môi trường phát triển, `applyComputedValues` cảnh báo khi một chuỗi `computeValue` không hội tụ sau một lượt.

```ts
import { applyComputedValues } from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  { name: 'firstName', type: 'text' },
  { name: 'lastName', type: 'text' },
  {
    name: 'fullName',
    type: 'text',
    computeValue: (data) =>
      `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
  },
];

applyComputedValues(fields, { firstName: 'Ada', lastName: 'Lovelace' });
// => { firstName: 'Ada', lastName: 'Lovelace', fullName: 'Ada Lovelace' }
```

Các adapter tự gọi `applyComputedValues` mỗi khi dữ liệu của `MultiFieldInput` thay đổi. Thường bạn chỉ cần import trực tiếp khi xử lý dữ liệu form bên ngoài component (ví dụ lúc submit).
