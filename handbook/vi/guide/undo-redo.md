---
title: Undo và redo
---

# Undo và redo

`createFormHistory` cho form khả năng undo và redo. Giống bản nháp, nó không gắn với adapter nào: đẩy dữ liệu vào mỗi khi dữ liệu đổi, và đặt thứ mà `undo` hoặc `redo` trả về trở lại form.

```tsx
import { createFormHistory } from '@dynamic-field-kit/core';
import { useDynamicForm } from '@dynamic-field-kit/react';

function ProfileForm() {
  const form = useDynamicForm({ fields, initialValues });
  const [history] = useState(() => createFormHistory(form.data));

  useEffect(() => history.push(form.data), [form.data]);

  const undo = () => {
    const data = history.undo();
    if (data) form.setData(data);
  };
  const redo = () => {
    const data = history.redo();
    if (data) form.setData(data);
  };
  // <button disabled={!history.canUndo()} onClick={undo}>Undo</button>
}
```

Với Vue và Angular, đặt dữ liệu trở lại form bằng `form.handleChange(data)` / `store.handleChange(data)`.

| Tuỳ chọn     | Ý nghĩa                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `limit`      | Số bước undo được giữ (mặc định 100); bước cũ nhất bị bỏ trước.                                                           |
| `coalesceMs` | Các lần đẩy cùng đổi một nhóm field cấp cao nhất trong khoảng này được gộp thành một bước (mặc định 500). `0` là tắt gộp. |

`canUndo()` và `canRedo()` cho biết có bước nào để đi tới không, `current()` trả về dữ liệu ở bước hiện tại, và `reset(data)` xoá lịch sử — ví dụ sau khi submit hoặc sau khi nạp một bản nháp.

Những điều cần biết:

- **Đẩy đúng dữ liệu mà `current()` đang giữ thì bị bỏ qua.** Khôi phục một bước khiến form báo lại chính dữ liệu đó, và lần báo ấy không thành bước mới, cũng không xoá các bước redo.
- **Việc gõ phím được gộp lại.** Gõ một từ vào một ô được undo trong một lần; nghỉ lâu hơn `coalesceMs`, đổi sang field khác, hoặc một lần undo sẽ mở bước mới.
- **Các bước được giữ theo tham chiếu.** Object và mảng thuần được so theo nội dung; giá trị khác (`Date`, `File`) so theo định danh. Hãy thay dữ liệu form bằng bản mới thay vì sửa tại chỗ, như các adapter vốn làm.
