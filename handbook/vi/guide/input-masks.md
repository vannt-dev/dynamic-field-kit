---
title: Mask nhập liệu
---

# Mask nhập liệu

`mask` của một field hiển thị giá trị đã định dạng ngay trong lúc gõ; form vẫn giữ giá trị chưa định dạng.

```ts
import { createInputMask } from '@dynamic-field-kit/core';
import type { FieldDescription, InputMask } from '@dynamic-field-kit/core';

const phone: FieldDescription = {
  name: 'phone',
  type: 'text',
  mask: '(999) 999-9999',
};

// Cùng mask đó ở ngoài form, cho một ô của bảng hoặc một dòng tóm tắt.
const mask = createInputMask('(999) 999-9999');
mask.format('5551234567'); // '(555) 123-4567'
mask.format('555'); // '(555'
mask.parse('(555) 123-4567'); // '5551234567'

// Điều mà pattern không diễn tả được: một cặp hàm.
const upper: InputMask = {
  format: (value) => String(value ?? ''),
  parse: (text) => text.toUpperCase(),
};
```

**Pattern.** `9` là một chữ số, `a` là một chữ cái (của bất kỳ bảng chữ nào), `*` là một trong hai. Mọi ký tự khác là ký tự cố định, và dấu gạch chéo ngược biến ký tự đứng sau nó thành cố định (`'\\9'`). Giá trị được lưu là các ký tự đã gõ vào những vị trí đó, không gồm ký tự cố định.

**Cái được hiển thị.** Một ký tự cố định chỉ hiện ra khi ký tự đứng sau nó đã có, và các ký tự kết thúc pattern chỉ hiện khi mọi vị trí đã được điền, nên văn bản không bao giờ kết thúc bằng một dấu phân cách mà Backspace phải giằng co với nó. Một giá trị đã lưu mà không khớp pattern được hiển thị tới chỗ còn khớp: ký tự không khớp vị trí nào bị bỏ qua, phần vượt quá vị trí cuối cũng vậy.

**Cái được lưu.** `parse(text, previous)` đọc ngược văn bản của ô nhập. Ký tự không khớp vị trí của nó bị bỏ; ký tự cố định được so khớp chứ không được lưu (số `1` của `'+1 (999) 999-9999'` không bao giờ bị coi là một chữ số người dùng gõ). `previous` là giá trị form đang giữ lúc văn bản được sửa. Nhờ nó, việc xoá một dấu phân cách được phân biệt với việc chỉ gõ lại văn bản, và ký tự đã gõ đứng trước dấu phân cách bị xoá, đúng như ý của Backspace. Một cặp `{ format, parse }` cũng nhận tham số thứ hai này.

**Validation** chạy trên giá trị được lưu. Pattern tự nó không làm một giá trị chưa gõ xong thành không hợp lệ: `validators.minLength(10)` hoặc `validators.pattern` mới là thứ nói khi nào giá trị đã đủ.

**Con trỏ.** Thư viện viết lại văn bản và để con trỏ cho trình duyệt lo: gõ và xoá ở cuối hoạt động như mong đợi, còn một lần sửa ở giữa khiến mask viết lại văn bản sẽ đưa con trỏ về cuối.

**Renderer** không cần thay đổi. Renderer nhận văn bản đã định dạng qua `value` và báo văn bản vừa sửa qua `onValueChange`. Renderer phải hiển thị `value` mỗi khi được trao, như một input controlled vẫn làm.

**Adapter.** `buildFieldRendererProps` chỉ áp mask khi được yêu cầu, bằng `applyMask: true`. Khi đó nó trả về văn bản đã định dạng làm `value` và một hàm `parseInput`; adapter giữ hàm này cho mình và đặt nó giữa renderer và form: `onChange(parseInput ? parseInput(input) : input)`. Không có `applyMask` thì field được dựng như thể nó không có mask, đúng thứ mà một adapter chưa biết gì về mask cần: nếu không, adapter đó sẽ hiển thị văn bản đã định dạng rồi lưu chính văn bản ấy làm giá trị.
