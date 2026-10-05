---
title: Wizard nhiều bước
---

# Wizard nhiều bước

Một máy trạng thái không phụ thuộc framework, chạy trên các nhóm field. State là bất biến: mỗi lần điều hướng trả về một object mới.

```ts
import {
  createWizardState,
  validateStep,
  goNext,
  goPrev,
  isStepCompleted,
} from '@dynamic-field-kit/core';

let wizard = createWizardState([
  { id: 'account', title: 'Account', fields: accountFields },
  { id: 'profile', title: 'Profile', fields: profileFields },
]);

const { valid, errors } = validateStep(wizard.currentStep, data);
if (valid) {
  wizard = goNext(wizard); // records the step it leaves in completedSteps
}
```

| Export                             | Mô tả                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `createWizardState(steps, index?)` | State ban đầu; `index` được ép vào khoảng hợp lệ                                            |
| `validateStep(step, data)`         | `{ valid, errors }` cho các field của một bước                                              |
| `canGoNext` / `canGoPrev`          | Có thể di chuyển hay không                                                                  |
| `goNext` / `goPrev`                | Đi một bước; trả về **chính object cũ** khi không đi được, nên `===` phát hiện được điều đó |
| `goToStep(state, index)`           | Nhảy tới bước bất kỳ (ép vào khoảng hợp lệ); không đánh dấu bước nào là hoàn tất            |
| `markStepCompleted(state, index?)` | Ghi nhận một bước đã xong, mặc định là bước hiện tại                                        |
| `isStepCompleted(state, index)`    | Dùng để vẽ thanh chỉ báo bước                                                               |

Mỗi bước là một `FormStep`, và `WizardState` là thứ mọi hàm ở trên nhận vào và trả về:

```ts
export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FieldDescription[];
}

export interface WizardState {
  currentStepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: FormStep;
  steps: FormStep[];
  completedSteps: number[];
}
```

`goNext` không validate — hãy tự gọi `validateStep`, để luồng "lưu nháp rồi quay lại sau" vẫn khả thi.

Xem chạy thật: tab **Wizard** trong [demo React](https://vannt-dev.github.io/dynamic-field-kit/react/wizard/), Vue và Angular.
