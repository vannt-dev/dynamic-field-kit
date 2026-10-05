---
title: Registry
---

# Registry

## Registry theo phạm vi

`fieldRegistry` là một singleton dùng chung trong cả tiến trình, cho mọi adapter. Để một phần của ứng dụng có bộ renderer riêng, hãy tạo một `FieldRegistry` độc lập và cung cấp nó bằng cơ chế của framework (React `FieldRegistryProvider`, Vue `provideFieldRegistry`, Angular token `FIELD_REGISTRY`). Code không cung cấp registry nào vẫn dùng singleton toàn cục.

```ts
import { FieldRegistry } from '@dynamic-field-kit/core';

const registry = new FieldRegistry();
registry.register('text', myRenderer);

registry.has('text'); // true
registry.list(); // ['text']
registry.unregister('text'); // true
```

## Đăng ký renderer qua adapter

`core` sở hữu thể hiện registry dùng chung, nhưng việc đăng ký renderer nên đi qua adapter của framework, để adapter đưa ra đúng kiểu renderer cho framework đó.

Các import thường dùng:

```ts
import { fieldRegistry as reactRegistry } from '@dynamic-field-kit/react';
import { fieldRegistry as vueRegistry } from '@dynamic-field-kit/vue';
import { fieldRegistry as angularRegistry } from '@dynamic-field-kit/angular';
```

Sau đó đăng ký renderer bằng adapter khớp với framework giao diện của bạn.

React:

```tsx
import { fieldRegistry } from '@dynamic-field-kit/react';

fieldRegistry.register('text', ({ value, onValueChange, label }) => (
  <label>
    <span>{label}</span>
    <input
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  </label>
));
```

Vue:

```ts
import { defineComponent, h } from 'vue';
import { fieldRegistry } from '@dynamic-field-kit/vue';

fieldRegistry.register(
  'text',
  defineComponent({
    setup() {
      return () => h('input');
    },
  }),
);
```

Angular:

```ts
import { fieldRegistry } from '@dynamic-field-kit/angular';
import { TextFieldComponent } from './text-field.component';

fieldRegistry.register('text', TextFieldComponent as any);
```

::: tip Renderer dựng sẵn không có nhãn
Renderer dựng sẵn của React và Vue chỉ là ô nhập trần, không nhãn, không style; Angular không có renderer dựng sẵn nào. Ứng dụng thật nên đăng ký renderer của riêng mình cho mọi loại field nó dùng — xem cách các [demo](https://vannt-dev.github.io/dynamic-field-kit/) làm.
:::
