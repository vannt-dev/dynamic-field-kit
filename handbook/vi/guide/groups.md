---
title: Nhóm lặp lại
---

# Nhóm lặp lại

## Nhóm field lặp lại

Một `FieldDescription` có `fields` trở thành nhóm lặp lại thay vì một field đơn được render qua registry: `data[name]` là một mảng các phần tử, mỗi phần tử có hình dạng theo `fields` lồng bên trong. `MultiFieldInput` của mọi adapter tự render một form con cho mỗi phần tử, kèm nút "Add" / "Remove" — không cần nối dây riêng cho từng adapter.

```ts
const fields: FieldDescription[] = [
  {
    name: 'contacts',
    type: 'group', // any type key works; only `fields` matters for grouping
    label: 'Contacts',
    fields: [
      { name: 'email', type: 'text', label: 'Email' },
      { name: 'phone', type: 'text', label: 'Phone' },
    ],
    defaultItem: { email: '', phone: '' }, // seed values for a new item
    minItems: 1,
    maxItems: 5,
  },
];
```

Đặt `keyField` là một thuộc tính của phần tử (ví dụ `id`) để mỗi phần tử giữ định danh ổn định trong danh sách. Nếu không, chỉ số mảng được dùng, và trạng thái của phần tử sẽ bị gán nhầm khi một phần tử bị đổi chỗ hoặc bị xoá ở giữa.

Các hàm `isFieldGroup`, `createGroupItem`, `canAddGroupItem` và `canRemoveGroupItem` đứng sau tính năng này. Chúng được export cho adapter (hoặc ứng dụng) cần lặp lại đúng logic giới hạn thêm/xoá ở ngoài `MultiFieldInput`.

## Các hàm thao tác mảng của nhóm

`MultiFieldInput` của mọi adapter tự render nút thêm/xoá. Các hàm dưới đây dành cho lúc bạn tự điều khiển mảng của nhóm — tay nắm kéo thả, nút "nhân bản dòng", renderer nhóm tuỳ biến. Tất cả đều là hàm thuần và không bao giờ sửa đầu vào:

```ts
import {
  moveGroupItem,
  swapGroupItems,
  insertGroupItem,
  isFieldGroup,
  createGroupItem,
  canAddGroupItem,
  canRemoveGroupItem,
  focusFirstInvalidField,
} from '@dynamic-field-kit/core';

const reordered = moveGroupItem(items, 3, 0); // same array back if out of range
const withRow = insertGroupItem(items, 1, createGroupItem(field));

if (canAddGroupItem(field, items)) {
  /* respects maxItems */
}

// After a failed submit: focus + scroll to the first [aria-invalid="true"] field
focusFirstInvalidField(formElement);
```
