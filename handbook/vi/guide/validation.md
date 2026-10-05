---
title: Validation và điều kiện
---

# Validation và điều kiện

`validate`, `disabledCondition` và `readOnlyCondition` là các hook do ứng dụng cung cấp trên `FieldDescription`. `@dynamic-field-kit/core` có sẵn một bộ validator tiện dụng cùng các hàm validation bất đồng bộ (`validateFieldsAsync`).

```ts
import {
  validators,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';

const fields: FieldDescription[] = [
  {
    name: 'email',
    type: 'text',
    // Built-in composed validator
    validate: validators.compose(
      validators.required('Email is required'),
      validators.email('Must be a valid email address'),
    ),
    readOnlyCondition: (data, rootData) => (rootData ?? data).frozen === true,
  },
  {
    name: 'username',
    type: 'text',
    // Async validation (e.g. checking availability via API)
    validate: async (value) => {
      if (!value) return 'Username required';
      const available = await checkUsername(String(value));
      return available ? undefined : 'Username already taken';
    },
  },
  {
    name: 'city',
    type: 'select',
    // Dynamic options callback dependent on current form data
    options: (data) =>
      data.country === 'VN' ? ['Hanoi', 'HCM'] : ['NY', 'LA'],
    disabledCondition: (data) => !data.country,
  },
];
```

## Bộ validator dựng sẵn

`validators` cung cấp các hàm kiểm tra thông dụng:

- `validators.required(message?)` — bắt buộc có giá trị
- `validators.email(message?)` — đúng mẫu email
- `validators.minLength(min, message?)` — độ dài tối thiểu của chuỗi/mảng
- `validators.maxLength(max, message?)` — độ dài tối đa của chuỗi/mảng
- `validators.min(minVal, message?)` — giá trị số tối thiểu
- `validators.max(maxVal, message?)` — giá trị số tối đa
- `validators.pattern(regex, message?)` — khớp biểu thức chính quy
- `validators.matches(otherFieldName, message?)` — bằng với field khác, dùng cho nhập lại mật khẩu / email. Bỏ qua giá trị rỗng để `required` lo thông báo đó, và so bằng `Object.is` nên hai `NaN` vẫn khớp
- `validators.compose(...fns)` — gộp nhiều validator thành một

`validateFields(fields, data, rootData?, context?)` trả về `{ valid, errors, complete, status }`, đi sâu vào các nhóm lặp lại (khoá dạng `contacts[0].email`) và bỏ qua field đang bị ẩn bởi `appearCondition` hoặc bị disabled. Các adapter gọi `validateField` / `resolveDisabled` / `resolveReadOnly` / `resolveOptions` cho từng field để đưa `error`, `disabled`, `readOnly` và `options` đã tính tới renderer.

## Thông báo validation

Validator dựng sẵn lấy thông báo lúc chúng **chạy**, không phải lúc mô tả field được dựng, nên một bảng thông báo đặt một lần cho form sẽ tới được tất cả:

```ts
import {
  createMessageResolver,
  setDefaultMessages,
} from '@dynamic-field-kit/core';

// Per form, through an adapter:
useDynamicForm({ fields, messages: { required: 'Bắt buộc' } });

// Or process-wide, for direct validateFields callers:
setDefaultMessages({ required: 'Bắt buộc' });

// Or built by hand and passed as the validation context:
validateFields(fields, data, undefined, {
  t: createMessageResolver({ required: 'Bắt buộc' }),
});
```

Thứ tự ưu tiên: thông báo truyền thẳng vào validator, rồi bảng của form, rồi bảng toàn tiến trình, cuối cùng là mặc định tiếng Anh của validator.

| Khoá        | Tham số   | Mặc định tiếng Anh      |
| ----------- | --------- | ----------------------- |
| `required`  | —         | Field is required       |
| `email`     | —         | Invalid email address   |
| `minLength` | `{min}`   | Minimum length is {min} |
| `maxLength` | `{max}`   | Maximum length is {max} |
| `min`       | `{min}`   | Minimum value is {min}  |
| `max`       | `{max}`   | Maximum value is {max}  |
| `pattern`   | —         | Invalid format          |
| `matches`   | `{other}` | Must match {other}      |

**Gói này không kèm bộ ngôn ngữ nào.** Hãy tự cung cấp bảng thông báo của bạn. Placeholder không có tham số tương ứng được giữ nguyên văn thay vì thành `undefined`, nên lỗi gõ nhầm sẽ lộ ra dưới dạng một `{unit}` nhìn thấy được.

`ValidationContext` — vốn là tham số thứ tư của `validate`, mang theo `signal` — có thêm `t` tuỳ chọn, để validator tự viết cũng dịch thông báo của mình theo cùng cách.

## Options bất đồng bộ

`options` nhận một mảng tĩnh, một hàm đồng bộ `(data, rootData) => Options[]`, hoặc một loader trả về promise.

```ts
{
  name: 'city',
  type: 'select',
  options: async (data, _rootData, ctx) =>
    fetch(`/api/cities?country=${data.country}`, { signal: ctx?.signal })
      .then((r) => r.json()),
  optionsDeps: (data) => [data.country],
  debounceMs: 200,
}
```

| Thuộc tính    | Tác dụng                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `optionsDeps` | Các giá trị mà việc nạp lại phụ thuộc vào, so nông bằng `Object.is`. Mặc định `[]` — nạp một lần |
| `optionsMode` | `'async'` cho loader trả về promise mà không có từ khoá `async`                                  |
| `debounceMs`  | Gộp các lần nạp lại dồn dập thành một lần fetch. Chỉ áp dụng cho options bất đồng bộ             |

Renderer nhận `optionsStatus` (`'idle' | 'loading' | 'ready' | 'error'`), `optionsError`, và `onOptionsQuery(query)` cho field tìm kiếm từ xa mà dữ liệu form không bao giờ thấy chuỗi truy vấn.

`createOptionsLoader(field, onChange)` là bộ máy không phụ thuộc framework mà các adapter bọc lại: nó debounce, huỷ request đã bị thay thế qua `ctx.signal`, và bỏ response về sai thứ tự, nên danh sách luôn phản ánh request mới nhất chứ không phải request về sau cùng.

Hàm `async` thuần được nhận diện tự động. Loader bị bọc bởi memoiser, spy hay helper của transpiler thì **không**. Hãy khai báo `optionsMode: 'async'` cho các trường hợp đó; thiếu nó thì promise bị bỏ và có cảnh báo ở môi trường phát triển.

## Đọc một `ValidationResult`

```ts
interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  /** Fields whose validator could not run synchronously. Omitted when empty. */
  pending?: string[];
  /** True only when every applicable validator finished in this pass. */
  complete: boolean;
  status: 'valid' | 'invalid' | 'pending';
}
```

Hãy đọc `status`. Riêng `valid` không phân biệt được "không có gì sai" với "chưa có gì sai": một form chỉ còn một quy tắc kiểm tra trùng lặp từ xa sẽ báo `valid: true` khi quy tắc đó chưa chạy. `status` là `'pending'` đúng lúc còn điều gì chưa có câu trả lời, và `complete` cho biết mọi validator áp dụng được đã chạy xong hay chưa.

## Validation đồng bộ và bất đồng bộ

`validateField` và `validateFields` là đồng bộ. Validator bất đồng bộ không bao giờ được gọi trên đường đó — nó được liệt kê trong `result.pending`, và kết quả trả về `status: 'pending'`. Muốn có câu trả lời cuối cùng, validator bất đồng bộ phải đi qua cặp hàm async:

```ts
import {
  validateField,
  validateFieldAsync,
  validateFields,
  validateFieldsAsync,
} from '@dynamic-field-kit/core';

// One field. Both always return string[] (empty when valid).
const errors = validateField(field, value, data, rootData); // string[]
const errorsAsync = await validateFieldAsync(field, value, data, rootData);

// A whole schema. The sync result may also include `pending` field names.
const result = validateFields(fields, data); // sync hooks only
const resultAsync = await validateFieldsAsync(fields, data); // awaits each hook
```

`validateFieldsAsync` chạy song song các validator độc lập thay vì chờ từng cái, nên form có nhiều quy tắc từ xa chỉ tốn thời gian của quy tắc chậm nhất.

Các helper form của từng framework giữ validation trực tiếp ở dạng đồng bộ, nhưng handler submit của chúng tự chạy một lượt validation có hỗ trợ async. Chúng cũng có `validateAsync()` cho các kiểm tra phải xong trước khi submit.

### Khai báo validator bất đồng bộ

Hàm `async` thuần được nhận diện tự động. Hàm trả về Promise mà không có từ khoá `async` thì không phân biệt được với hàm đồng bộ cho tới khi được gọi, nên hãy khai báo:

```ts
const field: FieldDescription = {
  name: 'username',
  type: 'text',
  validationMode: 'async',
  validate: (value) => checkAvailability(value), // returns a Promise
};
```

Với `validationMode: 'async'`, lượt đồng bộ không bao giờ gọi validator đó — không tốn một request cho mỗi phím gõ.

### Huỷ một lượt chạy

`validateFieldsAsync(fields, data, rootData?, options?)` nhận một `ValidationContext` và trao `AbortSignal` của nó cho mọi validator ở tham số thứ tư:

```ts
const controller = new AbortController();
const result = await validateFieldsAsync(fields, data, data, {
  signal: controller.signal,
});

const field: FieldDescription = {
  name: 'username',
  type: 'text',
  validationMode: 'async',
  validate: (value, _data, _rootData, context) =>
    fetch(`/api/available?u=${value}`, { signal: context?.signal }).then((r) =>
      r.ok ? undefined : 'Already taken',
    ),
};
```

Khi signal bị huỷ, các validator còn lại bị bỏ qua và kết quả trả về `complete: false` / `status: 'pending'` — một câu trả lời dở dang, không bao giờ là "valid" giả. Validator tôn trọng signal bằng cách reject với `AbortError` cũng được xử lý như vậy, nên một lượt bị huỷ không làm reject phía gọi. Lỗi khác vẫn được ném ra.

Các helper form của framework tự tạo và huỷ các controller này: gõ phím sẽ huỷ lượt validation đang chạy, nên kết quả cũ không đè lên kết quả mới.

## Schema adapter (Zod, Yup, Valibot / Standard Schema)

Gắn một schema vào hook `validate` của field. Mặc định schema được coi là **schema object mô tả cả form**, và tên field chọn ra các lỗi cần hiển thị:

```ts
import {
  zodValidator,
  yupValidator,
  valibotValidator,
} from '@dynamic-field-kit/core';

const schema = z.object({ email: z.string().email() });

const fields: FieldDescription[] = [
  { name: 'email', type: 'text', validate: zodValidator(schema, 'email') },
];
```

Với **schema vô hướng** cho một giá trị đơn, hãy nói rõ:

```ts
validate: zodValidator(z.string().email(), { target: 'field' });
```

Cả hai nhận `SchemaValidatorOptions` — `{ field?: string; target?: 'form' | 'field' }`. `valibotValidator` là bí danh của `standardSchemaValidator`, xử lý được mọi object Standard Schema (kể cả `~standard` của Zod).

Các adapter này parse **đồng bộ**, nên kết quả dùng được với `validateFields` đồng bộ (và do đó với các hook form của framework). Schema có refinement async hoặc quy tắc `.test()` async không parse đồng bộ được — chúng trả về Promise, nên hãy validate qua `validateFieldsAsync`.
