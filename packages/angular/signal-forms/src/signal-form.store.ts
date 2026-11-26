import {
  computed,
  type Injector,
  signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  hidden,
  isFieldTree,
  readonly,
  submit,
  validateTree,
  type FieldTree,
  type SchemaFn,
  type SchemaPathTree,
  type ValidationError,
} from '@angular/forms/signals';
import {
  applyComputedValues,
  collectFieldPaths,
  createMessageResolver,
  FORM_ERROR_KEY,
  resolveDisabled,
  resolveReadOnly,
  resolveVisible,
  validateFields,
  validateFieldsAsync,
  type FieldDescription,
  type MessageCatalog,
  type Properties,
  type ValidationContext,
} from '@dynamic-field-kit/core';

/** The `kind` of every error the field descriptions' own rules produce. */
export const DFK_VALIDATION_KIND = 'dfk';
/** The `kind` of an error an async validator found during a submit. */
export const DFK_ASYNC_VALIDATION_KIND = 'dfk-async';
/** The `kind` of an error a submit handler returned from the server. */
export const DFK_SERVER_KIND = 'dfk-server';

/**
 * A Signal Forms validation error raised for a dfk field. `path` is the dfk
 * path (`email`, `contacts[0].email`, `address.city`), the same key the
 * `errors` map of a dfk form store uses.
 */
export interface DynamicFieldValidationError
  extends ValidationError.WithOptionalFieldTree {
  readonly kind: string;
  readonly message: string;
  readonly path: string;
}

export interface DynamicFieldsSchemaOptions {
  /** Messages for the built-in validators, as in `createDynamicFormStore`. */
  messages?: MessageCatalog;
}

// Signal Forms trees are typed from the model, and a dfk model is an open
// Record, so walking one by a runtime path has to leave the static types.
type AnyTree = FieldTree<unknown> & Record<string | number, unknown>;

function pathSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment !== '');
}

/**
 * The Signal Forms field for a dfk path, or undefined when the form has none
 * for it. Signal Forms only creates a child for a key whose value is defined,
 * so a field the model has not got a value for yet has no `FieldTree`.
 */
export function fieldTreeAt<TModel>(
  root: FieldTree<TModel>,
  path: string,
): FieldTree<unknown> | undefined {
  let node: unknown = root;
  for (const segment of pathSegments(path)) {
    node = (node as AnyTree)[segment];
    if (!isFieldTree(node)) {
      return undefined;
    }
  }
  return node as FieldTree<unknown>;
}

function toTreeErrors(
  errors: Record<string, string[]>,
  root: FieldTree<Properties>,
  kind: string,
): DynamicFieldValidationError[] {
  return Object.entries(errors).flatMap(([path, messages]) => {
    const fieldTree = fieldTreeAt(root, path) ?? root;
    return messages.map((message) => ({ kind, message, path, fieldTree }));
  });
}

function asMessages(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A Signal Forms schema that runs a dfk field list's own rules.
 *
 * - Validation: one tree validator runs core's `validateFields` over the whole
 *   model, so conditional, cross-field, group and section rules behave as in
 *   every other adapter. Each error lands on its field when the form has one
 *   for it, on the root otherwise, and carries its dfk `path` either way.
 * - `appearWhen`/`appearCondition`, `disabled`/`disabledWhen` and
 *   `readOnlyWhen` of the top-level fields become Signal Forms `hidden`,
 *   `disabled` and `readonly` rules, so `form.email().hidden()` agrees with
 *   what the dfk renderer shows.
 *
 * Validators that return a Promise are not run here; Signal Forms validation
 * is synchronous unless it goes through resources. `createSignalFormStore`
 * runs them on submit instead.
 */
export function dynamicFieldsSchema(
  fields: FieldDescription[],
  options: DynamicFieldsSchemaOptions = {},
): SchemaFn<Properties> {
  const context: ValidationContext = {
    t: createMessageResolver(options.messages),
  };
  return (root: SchemaPathTree<Properties>) => {
    const paths = root as unknown as Record<string, SchemaPathTree<unknown>>;
    for (const field of fields) {
      const path = paths[field.name];
      hidden(path, {
        when: ({ valueOf }) => !resolveVisible(field, valueOf(root)),
      });
      disabled(path, {
        when: ({ valueOf }) => resolveDisabled(field, valueOf(root)),
      });
      readonly(path, {
        when: ({ valueOf }) => resolveReadOnly(field, valueOf(root)),
      });
    }
    validateTree(root, ({ value, fieldTree }) =>
      toTreeErrors(
        validateFields(fields, value(), undefined, context).errors,
        fieldTree as FieldTree<Properties>,
        DFK_VALIDATION_KIND,
      ),
    );
  };
}

export interface SignalFormStoreOptions<
  TModel extends Properties = Properties,
> {
  fields: FieldDescription[];
  initialValues?: Partial<TModel>;
  messages?: MessageCatalog;
  /**
   * More Signal Forms rules, applied after the field descriptions' own. Their
   * errors show in `errors` under the dfk path of the field they are on.
   */
  schema?: SchemaFn<TModel>;
  /**
   * The injector `form()` runs in. Leave it out when the store is created in
   * an injection context (a field initializer or constructor).
   */
  injector?: Injector;
}

/**
 * What a submit handler may return: errors from the server by dfk path. They
 * become Signal Forms submission errors, so each one stays on its field until
 * that field's value changes.
 */
export type SignalFormSubmitResult = Record<string, string | string[]> | void;

/**
 * A dynamic form whose state lives in an Angular Signal Form.
 *
 * The returned object has the members of `createDynamicFormStore` that
 * `<dfk-multi-field-input>` binds to (`data`, `errors`, `touched`,
 * `handleChange`, `handleBlur`, `handleSubmit`), plus `form`: the Signal
 * Forms `FieldTree`, for reading field state (`form.email().valid()`),
 * binding a hand-written control with `[formField]`, or calling `submit()`.
 *
 * `TModel` types the model, and with it `form`: with
 * `createSignalFormStore<Signup>(...)`, `form.email` is a field rather than a
 * possibly-missing one. It defaults to dfk's open `Properties`.
 *
 * Requires Angular 22 (`@angular/forms/signals`). The default
 * `createDynamicFormStore` from `@dynamic-field-kit/angular` is unchanged.
 */
export function createSignalFormStore<TModel extends Properties = Properties>(
  options: SignalFormStoreOptions<TModel>,
) {
  const fields = options.fields;
  const initialValues: Properties = options.initialValues ?? {};
  const context: ValidationContext = {
    t: createMessageResolver(options.messages),
  };
  const fieldsSchema = dynamicFieldsSchema(fields, {
    messages: options.messages,
  });
  const extraSchema = options.schema;

  const model: WritableSignal<TModel> = signal(
    applyComputedValues(fields, initialValues) as TModel,
  );
  const typedTree: FieldTree<TModel> = form(
    model,
    (root: SchemaPathTree<TModel>) => {
      fieldsSchema(root as unknown as SchemaPathTree<Properties>);
      extraSchema?.(root);
    },
    { injector: options.injector },
  );
  // The same tree, seen as the open record the path helpers walk.
  const tree = typedTree as unknown as FieldTree<Properties>;

  // Signal Forms keeps touched/dirty per field, and only for fields that have
  // a value. These cover the rest, so a field blurred while still empty
  // counts as touched too.
  const ownTouched = signal<Record<string, boolean>>({});
  const ownDirty = signal(false);
  const submitCount = signal(0);

  const paths = computed(() => collectFieldPaths(fields, model()));

  const touched = computed<Record<string, boolean>>(() => {
    const marked = ownTouched();
    const out: Record<string, boolean> = {};
    for (const path of paths()) {
      if (marked[path] || fieldTreeAt(tree, path)?.().touched()) {
        out[path] = true;
      }
    }
    return out;
  });

  /** Every error the Signal Form holds, by dfk path, shown or not. */
  const allErrors = computed<Record<string, string[]>>(() => {
    const byTree = new Map<unknown, string>();
    for (const path of paths()) {
      const fieldTree = fieldTreeAt(tree, path);
      if (fieldTree) {
        byTree.set(fieldTree, path);
      }
    }
    const out: Record<string, string[]> = {};
    for (const error of tree().errorSummary()) {
      const own = (error as Partial<DynamicFieldValidationError>).path;
      const path =
        typeof own === 'string'
          ? own
          : (byTree.get(error.fieldTree) ?? FORM_ERROR_KEY);
      (out[path] ??= []).push(error.message ?? error.kind);
    }
    return out;
  });

  /**
   * The errors to display: those of touched fields, plus any form-level
   * error. Bind this to `[errors]`; a field's error shows once it is blurred
   * or the form is submitted, as with `createDynamicFormStore`.
   */
  const errors = computed<Record<string, string[]>>(() => {
    const isTouched = touched();
    return Object.fromEntries(
      Object.entries(allErrors()).filter(
        ([path]) => path === FORM_ERROR_KEY || isTouched[path],
      ),
    );
  });

  const isValid = computed(() => tree().valid());
  const isValidating = computed(() => tree().pending());
  const isSubmitting = computed(() => tree().submitting());
  const isDirty = computed(() => ownDirty() || tree().dirty());

  function setFieldTouched(path: string, isTouched = true) {
    ownTouched.update((marked) => ({ ...marked, [path]: isTouched }));
    if (isTouched) {
      fieldTreeAt(tree, path)?.().markAsTouched();
    }
  }

  function touchAll() {
    ownTouched.set(
      Object.fromEntries(paths().map((path) => [path, true] as const)),
    );
    tree().markAsTouched();
  }

  function handleChange(next: Properties) {
    const previous: Properties = model();
    const value = applyComputedValues(fields, next) as TModel;
    model.set(value);
    ownDirty.set(true);
    for (const key of Object.keys(value)) {
      if (!Object.is(previous[key], value[key])) {
        fieldTreeAt(tree, key)?.().markAsDirty();
      }
    }
  }

  function setFieldValue(name: keyof TModel & string, value: unknown) {
    handleChange({ ...model(), [name]: value });
  }

  function handleBlur(path: string) {
    setFieldTouched(path, true);
  }

  /** Touches every field and returns whether the form is valid right now. */
  function validate(): boolean {
    touchAll();
    return tree().valid();
  }

  function reset(newValues?: Partial<TModel>) {
    model.set(
      applyComputedValues(fields, newValues ?? initialValues) as TModel,
    );
    tree().reset();
    ownTouched.set({});
    ownDirty.set(false);
    submitCount.set(0);
  }

  /**
   * Returns a submit handler for `(ngSubmit)`. It goes through Signal Forms
   * `submit()`: every field is marked touched, and `onValid` only runs when
   * the form is valid. Validators that return a Promise run first, inside the
   * submit; if they fail, their errors land on the fields and `onInvalid`
   * runs instead. `onValid` may return server errors by dfk path.
   */
  function handleSubmit(
    onValid: (
      data: TModel,
    ) => SignalFormSubmitResult | Promise<SignalFormSubmitResult>,
    onInvalid?: (errors: Record<string, string[]>) => void,
  ) {
    return async (event?: Event) => {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      touchAll();
      let invalid = false;
      try {
        await submit(typedTree, {
          action: async () => {
            const snapshot = model();
            const checked = await validateFieldsAsync(
              fields,
              snapshot,
              snapshot,
              context,
            );
            if (!checked.valid) {
              invalid = true;
              return toTreeErrors(
                checked.errors,
                tree,
                DFK_ASYNC_VALIDATION_KIND,
              );
            }
            const server = await onValid(snapshot);
            if (!server) {
              return undefined;
            }
            const byPath = Object.fromEntries(
              Object.entries(server).map(([path, value]) => [
                path,
                asMessages(value),
              ]),
            );
            return toTreeErrors(byPath, tree, DFK_SERVER_KIND);
          },
          onInvalid: () => {
            invalid = true;
          },
        });
      } finally {
        submitCount.update((count) => count + 1);
      }
      if (invalid) {
        onInvalid?.(allErrors());
      }
    };
  }

  return {
    /** The Signal Forms field tree backing the form. */
    form: typedTree,
    /** The model signal; the same signal as `data`. */
    model,
    data: model,
    errors,
    allErrors,
    touched,
    isValid,
    isValidating,
    isSubmitting,
    isDirty,
    submitCount: submitCount.asReadonly(),
    setFieldValue,
    setFieldTouched,
    touchAll,
    handleChange,
    handleBlur,
    validate,
    reset,
    handleSubmit,
  };
}

export type SignalFormStore<TModel extends Properties = Properties> =
  ReturnType<typeof createSignalFormStore<TModel>>;
