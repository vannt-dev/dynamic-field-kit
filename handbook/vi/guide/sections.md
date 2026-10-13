---
title: Section
---

# Section

Một `FieldDescription` có `section` là một section có tiêu đề chứ không phải một field lá do registry render: `data[name]` là một object có hình dạng theo các field lồng bên trong. Nó là người anh em không lặp lại của group, và `MultiFieldInput` của mọi adapter render nó thành một `<fieldset>` với `label` làm `<legend>`.

```ts
const fields: FieldDescription[] = [
  {
    name: 'address',
    type: 'section', // type nào cũng được; chỉ `section` mới quyết định
    label: 'Ship to',
    section: [
      { name: 'street', type: 'text', validate: validators.required() },
      { name: 'city', type: 'text' },
    ],
  },
];

validateFields(fields, { address: { city: 'Hue' } }).errors;
// { 'address.street': ['Field is required'] }
collectFieldPaths(fields, {});
// ['address.street', 'address.city']
```

- **Đường dẫn.** Lỗi, quy tắc còn `pending` và cờ touched của các field bên trong có key dạng `${name}.${childName}`; bên trong một mục của group thì thành `contacts[0].address.street`. `serverErrorsFrom` vốn đã trả lời theo các đường dẫn này.
- **Điều kiện.** `appearCondition`, `disabled` và `disabledCondition` đặt trên section loại cả section khỏi validation. Bên trong nó, một quy tắc hoặc điều kiện nhận object của section làm `data` và cả form làm `rootData`.
- **Dữ liệu chưa có.** Một section mà giá trị bị thiếu, hoặc không phải object, được đọc như một object rỗng.
- **JSON Schema.** `fieldsFromJsonSchema` biến một object lồng thành section và `fieldsToJsonSchema` ghi một section thành object lồng, với `properties` và `required` riêng của nó.
- **Một key riêng.** Section được đánh dấu bằng `section`, không phải bằng một cờ đặt cạnh `fields`: nhờ vậy một adapter chưa biết section sẽ báo loại field không xác định thay vì render ra một danh sách. Khi cả hai key cùng được đặt, `fields` thắng.

`isFieldSection` phân biệt section với phần còn lại, và `sectionPathMap(map, name)` cắt một map lỗi hoặc map touched xuống còn một section, với key tính từ bên trong nó: thứ mà adapter trao cho form lồng bên trong.

Section cần core và adapter từ bản 1.11 trở lên. Với core cũ hơn, adapter vẫn render section, nhưng validation của form không nhìn vào bên trong nó.
