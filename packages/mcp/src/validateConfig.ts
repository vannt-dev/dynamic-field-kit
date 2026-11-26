import {
  validateFields,
  type FieldDescription,
  type Properties,
} from '@dynamic-field-kit/core';

export type ConfigProblemSeverity = 'error' | 'warning';

export interface ConfigProblem {
  /**
   * Where the problem is: `[2]` is the third field, `[2].fields[0]` the first
   * field of its group, `[1].appearWhen.all[0]` a part of a condition.
   */
  path: string;
  severity: ConfigProblemSeverity;
  message: string;
}

export interface ValidateConfigOptions {
  /**
   * Form data to validate against the config with core's `validateFields`,
   * once the config itself has no errors.
   */
  data?: unknown;
  /**
   * Field types the app has renderers for. When given, any other `type` is a
   * warning. Leave it out to accept every type.
   */
  knownTypes?: readonly string[];
}

export interface ValidateConfigResult {
  /** True when no problem is an error. Warnings do not make a config invalid. */
  valid: boolean;
  problems: ConfigProblem[];
  /** Core's `validateFields` errors for `data`, by field path. */
  dataErrors?: Record<string, string[]>;
}

// Every key of FieldDescription. Typed as a full Record so that a key added to
// or removed from the core type fails the build here instead of drifting.
const KEY_KINDS: Record<keyof FieldDescription, KeyKind> = {
  name: 'string',
  type: 'string',
  id: 'string',
  label: 'string',
  placeholder: 'string',
  required: 'boolean',
  disabled: 'boolean',
  validate: 'function',
  validationMode: 'mode',
  appearCondition: 'function',
  appearWhen: 'condition',
  requiredWhen: 'condition',
  computeValue: 'function',
  disabledCondition: 'function',
  disabledWhen: 'condition',
  readOnlyCondition: 'function',
  readOnlyWhen: 'condition',
  options: 'options',
  optionsMode: 'mode',
  optionsDeps: 'function',
  min: 'numberOrString',
  max: 'numberOrString',
  step: 'numberOrString',
  accept: 'string',
  multiple: 'boolean',
  mask: 'mask',
  debounceMs: 'count',
  className: 'string',
  description: 'any',
  props: 'object',
  fields: 'fieldList',
  section: 'fieldList',
  defaultItem: 'object',
  keyField: 'string',
  minItems: 'count',
  maxItems: 'count',
  addLabel: 'string',
  removeLabel: 'string',
};

type KeyKind =
  | 'string'
  | 'boolean'
  | 'function'
  | 'mode'
  | 'condition'
  | 'options'
  | 'numberOrString'
  | 'mask'
  | 'count'
  | 'any'
  | 'object'
  | 'fieldList';

/** The keys a field test may carry besides `field` and `root`. */
const COMPARISONS = [
  'equals',
  'notEquals',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'notContains',
  'truthy',
  'empty',
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (value === null) {
    return 'null';
  }
  return typeof value === 'object' ? 'an object' : `a ${typeof value}`;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/** The closest candidate, for a "did you mean" on a misspelt name. */
function closest(
  key: string,
  candidates: Iterable<string>,
): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(key.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  // One edit is already most of a one- or two-letter name: no guess there.
  const allowed = key.length < 3 ? 0 : Math.max(1, Math.floor(key.length / 4));
  return bestDistance <= allowed ? best : undefined;
}

class Checker {
  readonly problems: ConfigProblem[] = [];

  constructor(private readonly knownTypes?: ReadonlySet<string>) {}

  error(path: string, message: string): void {
    this.problems.push({ path, severity: 'error', message });
  }

  warning(path: string, message: string): void {
    this.problems.push({ path, severity: 'warning', message });
  }

  fieldList(list: unknown, path: string, rootNames: ReadonlySet<string>) {
    if (!Array.isArray(list)) {
      this.error(
        path || '(root)',
        `expected an array of fields, got ${describe(list)}`,
      );
      return;
    }
    const names = new Set(
      list
        .filter(isObject)
        .map((field) => field.name)
        .filter((name): name is string => typeof name === 'string'),
    );
    const seen = new Set<string>();
    list.forEach((field, index) => {
      const at = `${path}[${index}]`;
      if (!isObject(field)) {
        this.error(at, `expected a field object, got ${describe(field)}`);
        return;
      }
      if (typeof field.name === 'string' && field.name !== '') {
        if (seen.has(field.name)) {
          this.error(
            `${at}.name`,
            `duplicate name "${field.name}": two fields would write the same value`,
          );
        }
        seen.add(field.name);
      }
      this.field(field, at, names, rootNames);
    });
  }

  field(
    field: Record<string, unknown>,
    at: string,
    siblings: ReadonlySet<string>,
    rootNames: ReadonlySet<string>,
  ) {
    if (typeof field.name !== 'string' || field.name === '') {
      this.error(`${at}.name`, 'every field needs a non-empty string "name"');
    }
    if (typeof field.type !== 'string' || field.type === '') {
      this.error(`${at}.type`, 'every field needs a non-empty string "type"');
    } else if (
      this.knownTypes &&
      !field.fields &&
      !field.section &&
      !this.knownTypes.has(field.type)
    ) {
      this.warning(
        `${at}.type`,
        `no renderer is registered for type "${field.type}"`,
      );
    }

    for (const [key, value] of Object.entries(field)) {
      const kind = (KEY_KINDS as Record<string, KeyKind | undefined>)[key];
      const where = `${at}.${key}`;
      if (kind === undefined) {
        const guess = closest(key, Object.keys(KEY_KINDS));
        this.warning(
          where,
          `unknown key "${key}"` + (guess ? `; did you mean "${guess}"?` : ''),
        );
        continue;
      }
      if (value === undefined) {
        continue;
      }
      this.value(kind, key, value, where, siblings, rootNames);
    }

    if (Array.isArray(field.fields) && Array.isArray(field.section)) {
      this.warning(
        `${at}.section`,
        'both "fields" and "section" are set; "fields" wins and the section is ignored',
      );
    }
    if (
      typeof field.minItems === 'number' &&
      typeof field.maxItems === 'number' &&
      field.minItems > field.maxItems
    ) {
      this.error(
        `${at}.minItems`,
        `minItems (${field.minItems}) is greater than maxItems (${field.maxItems})`,
      );
    }
    for (const key of ['minItems', 'maxItems', 'defaultItem', 'keyField']) {
      if (field[key] !== undefined && !Array.isArray(field.fields)) {
        this.warning(
          `${at}.${key}`,
          `"${key}" only applies to a repeatable group (a field with "fields")`,
        );
      }
    }
  }

  value(
    kind: KeyKind,
    key: string,
    value: unknown,
    where: string,
    siblings: ReadonlySet<string>,
    rootNames: ReadonlySet<string>,
  ) {
    switch (kind) {
      case 'string':
        if (typeof value !== 'string') {
          this.error(where, `expected a string, got ${describe(value)}`);
        }
        return;
      case 'boolean':
        if (typeof value !== 'boolean') {
          this.error(where, `expected true or false, got ${describe(value)}`);
        }
        return;
      case 'function':
        if (typeof value !== 'function') {
          this.error(
            where,
            `"${key}" must be a function, which a JSON config cannot hold; ` +
              'attach it in code, or use the declarative "...When" condition',
          );
        }
        return;
      case 'mode':
        if (value !== 'sync' && value !== 'async') {
          this.error(where, 'expected "sync" or "async"');
        }
        return;
      case 'condition':
        this.condition(value, where, siblings, rootNames);
        return;
      case 'options':
        if (typeof value === 'function') {
          return;
        }
        if (!Array.isArray(value)) {
          this.error(
            where,
            `expected an array of options, got ${describe(value)}`,
          );
          return;
        }
        value.forEach((option, index) => {
          if (!isObject(option)) {
            this.error(
              `${where}[${index}]`,
              `expected an option object such as { "label": "Yes", "value": true }, got ${describe(option)}`,
            );
          } else if (!('value' in option)) {
            this.warning(`${where}[${index}]`, 'option has no "value"');
          }
        });
        return;
      case 'numberOrString':
        if (typeof value !== 'number' && typeof value !== 'string') {
          this.error(
            where,
            `expected a number or string, got ${describe(value)}`,
          );
        }
        return;
      case 'mask':
        if (typeof value !== 'string' && !isObject(value)) {
          this.error(
            where,
            `expected a mask string or object, got ${describe(value)}`,
          );
        }
        return;
      case 'count':
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < 0
        ) {
          this.error(where, 'expected a whole number, 0 or more');
        }
        return;
      case 'object':
        if (!isObject(value)) {
          this.error(where, `expected an object, got ${describe(value)}`);
        }
        return;
      case 'fieldList':
        // Field tests inside a group item or section read that level's data.
        this.fieldList(value, where, rootNames);
        return;
      case 'any':
        return;
    }
  }

  condition(
    condition: unknown,
    where: string,
    siblings: ReadonlySet<string>,
    rootNames: ReadonlySet<string>,
  ) {
    if (!isObject(condition)) {
      this.error(
        where,
        `expected a condition object, got ${describe(condition)}`,
      );
      return;
    }
    for (const combinator of ['all', 'any'] as const) {
      if (combinator in condition) {
        const parts = condition[combinator];
        if (!Array.isArray(parts)) {
          this.error(
            `${where}.${combinator}`,
            'expected an array of conditions',
          );
          return;
        }
        parts.forEach((part, index) =>
          this.condition(
            part,
            `${where}.${combinator}[${index}]`,
            siblings,
            rootNames,
          ),
        );
        return;
      }
    }
    if ('not' in condition) {
      this.condition(condition.not, `${where}.not`, siblings, rootNames);
      return;
    }
    if (typeof condition.field !== 'string' || condition.field === '') {
      this.error(
        where,
        'a field test needs "field" (the name of the field it reads), or use "all", "any" or "not"',
      );
      return;
    }
    const tests = COMPARISONS.filter((key) => key in condition);
    if (tests.length !== 1) {
      this.error(
        where,
        tests.length === 0
          ? `no comparison; add exactly one of ${COMPARISONS.join(', ')}`
          : `more than one comparison (${tests.join(', ')}); split them with "all"`,
      );
      return;
    }
    const [test] = tests;
    const operand = condition[test];
    if ((test === 'in' || test === 'notIn') && !Array.isArray(operand)) {
      this.error(`${where}.${test}`, `"${test}" takes an array of values`);
    }
    if (
      (test === 'truthy' || test === 'empty') &&
      typeof operand !== 'boolean'
    ) {
      this.error(`${where}.${test}`, `"${test}" takes true or false`);
    }
    if (
      (test === 'gt' || test === 'gte' || test === 'lt' || test === 'lte') &&
      typeof operand !== 'number' &&
      !(typeof operand === 'string' && Number.isFinite(Number(operand)))
    ) {
      this.error(`${where}.${test}`, `"${test}" takes a number`);
    }
    const scope = condition.root === true ? rootNames : siblings;
    const head = condition.field.split('.')[0];
    if (!scope.has(head)) {
      const guess = closest(head, scope);
      let hint = guess ? `; did you mean "${guess}"?` : '';
      if (condition.root !== true && rootNames.has(head)) {
        hint = '; it is a top-level field: set "root": true to read it';
      }
      this.warning(
        `${where}.field`,
        `no field named "${head}" ` +
          (condition.root === true
            ? 'at the top level of the form'
            : 'at this level') +
          hint,
      );
    }
  }
}

/**
 * Checks a form config: a field list as JSON. It reports what core would
 * misread or silently ignore - a missing name or type, a duplicate name, a
 * condition that is not one (core treats it as false), a key that does not
 * exist, a function-only key holding data - and, with `data`, runs core's
 * `validateFields` over it.
 *
 * Core has no validator for the field list itself, only for form data, so the
 * structural rules live here; they follow `FieldDescription` and
 * `FieldCondition` in `@dynamic-field-kit/core`.
 */
export function validateConfig(
  config: unknown,
  options: ValidateConfigOptions = {},
): ValidateConfigResult {
  const checker = new Checker(
    options.knownTypes ? new Set(options.knownTypes) : undefined,
  );
  const rootNames = new Set(
    Array.isArray(config)
      ? config
          .filter(isObject)
          .map((field) => field.name)
          .filter((name): name is string => typeof name === 'string')
      : [],
  );
  checker.fieldList(config, '', rootNames);
  const problems = checker.problems;
  const valid = problems.every((problem) => problem.severity !== 'error');
  const result: ValidateConfigResult = { valid, problems };

  if (options.data !== undefined) {
    if (!isObject(options.data)) {
      problems.push({
        path: 'data',
        severity: 'error',
        message: `expected the form data as an object, got ${describe(options.data)}`,
      });
      result.valid = false;
    } else if (valid) {
      result.dataErrors = validateFields(
        config as FieldDescription[],
        options.data as Properties,
      ).errors;
    }
  }
  return result;
}
