---
title: Bắt đầu
---

# Bắt đầu

## Cài đặt

**Với React:**

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/react
```

**Với Angular:**

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/angular
```

**Với Vue:**

```bash
npm install @dynamic-field-kit/core @dynamic-field-kit/vue
```

> **`@dynamic-field-kit/core` là peer dependency của mọi adapter** (cũng như framework của bạn: `react` + `react-dom`, `vue`, hoặc `@angular/*`). Hãy cài nó tường minh như trên — các adapter không còn tự kéo `core` về. Dùng chung một phiên bản `core` giúp mọi adapter cùng trỏ tới một field registry.

## Ý tưởng cốt lõi

Thư viện **không định nghĩa sẵn các loại field** kiểu như:

```ts
'text' | 'number';
```

Thay vào đó, nó đưa ra một **interface có thể mở rộng** để ứng dụng tự bổ sung:

```ts
export interface FieldTypeMap {}
```

Nhờ vậy:

- Số loại field tuỳ biến là không giới hạn
- Vẫn có kiểu chặt chẽ mà không trói buộc người dùng thư viện
- Không cần build lại thư viện

Đây là cách các thư viện trưởng thành như **MUI, React Hook Form** và **Redux Toolkit** vẫn dùng.

## Khai báo loại field (phía ứng dụng)

Tạo một file `.d.ts` trong ứng dụng (ví dụ `src/types/dynamic-field.d.ts`):

```ts
import '@dynamic-field-kit/core';

declare module '@dynamic-field-kit/core' {
  interface FieldTypeMap {
    text: string;
    number: number;
    checkbox: boolean;
    select: string;
  }
}
```

⚠️ Nhớ đưa file này vào `tsconfig.json`.

## Bước tiếp theo

- [Mô tả field](./fields) — các thuộc tính của một `FieldDescription`.
- Trang riêng cho từng framework (tiếng Anh): [React](/frameworks/react), [Vue 3](/frameworks/vue), [Angular](/frameworks/angular).
- [Demo trực tiếp](https://vannt-dev.github.io/dynamic-field-kit/) của cả ba framework.
