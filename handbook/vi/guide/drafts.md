---
title: Lưu bản nháp
---

# Lưu bản nháp

`createFormDraft` giữ dữ liệu form trong storage giữa các lần truy cập, nên tải lại trang hay đóng tab không làm mất những gì đã nhập. Nó không gắn với adapter nào: nạp bản nháp vào giá trị ban đầu, lưu mỗi khi dữ liệu đổi, xoá sau khi submit.

```tsx
import { createFormDraft, draftExclusions } from '@dynamic-field-kit/core';
import { useDynamicForm } from '@dynamic-field-kit/react';

const draft = createFormDraft({
  key: 'signup-form',
  version: 1, // bump when the fields change shape
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  exclude: draftExclusions(fields), // passwords and file inputs
});

function SignupForm() {
  const form = useDynamicForm({
    fields,
    initialValues: draft.load() ?? { plan: 'free' },
  });

  useEffect(() => draft.save(form.data), [form.data]);
  useEffect(() => () => draft.flush(), []); // write what is pending on unmount

  const submit = form.handleSubmit(async (data) => {
    await api.signUp(data);
    draft.clear();
  });
  // …
}
```

Bốn lời gọi đó dùng y hệt với composable của Vue (`watch(() => form.data, draft.save, { deep: true })`) và signal store của Angular (`effect(() => draft.save(store.data()))`).

| Tuỳ chọn     | Ý nghĩa                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`        | Khoá lưu trữ. Mỗi form một khoá, và mỗi bản ghi một khoá khi sửa dữ liệu có sẵn.                                                               |
| `storage`    | Bất cứ thứ gì có `getItem` / `setItem` / `removeItem`. Mặc định là `localStorage`; truyền `sessionStorage` nếu muốn bản nháp mất khi đóng tab. |
| `version`    | Bản nháp lưu dưới version khác sẽ bị bỏ, không nạp vào các field đã đổi hình dạng.                                                             |
| `debounceMs` | Việc ghi chờ từng này mili giây sau lần `save` cuối (mặc định 300). `0` là ghi ngay.                                                           |
| `maxAgeMs`   | Bản nháp cũ hơn mức này bị bỏ khi nạp.                                                                                                         |
| `exclude`    | Tên các field cấp cao nhất không bao giờ được ghi.                                                                                             |
| `onError`    | Được gọi khi storage từ chối đọc hoặc ghi.                                                                                                     |

`load()` trả về `undefined` khi không có bản nháp dùng được, `flush()` ghi ngay lần lưu đang chờ, `clear()` xoá bản nháp, và `savedAt()` cho thời điểm ghi cuối — dùng cho thông báo kiểu "đã khôi phục bản nháp lưu lúc …".

Những điều cần biết:

- **Bản nháp là JSON thuần trong storage của trình duyệt.** Đừng để bí mật trong đó: `draftExclusions(fields)` liệt kê các field `password` và `file` ở cấp cao nhất, và bạn có thể thêm tên của riêng mình. Field nằm trong nhóm lặp lại không được lọc.
- **Storage có thể lỗi** (duyệt web riêng tư, hết quota, iframe bị sandbox, render phía server). Khi đó bản nháp không làm gì thay vì ném lỗi; `onError` sẽ được báo.
- **Giá trị mà JSON không biểu diễn được** (object `Date`, `File`, `undefined`) không sống sót qua một vòng lưu–nạp. Ngày lưu dạng chuỗi, như ô `date` dựng sẵn tạo ra, thì không sao.
