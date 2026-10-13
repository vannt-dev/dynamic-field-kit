/**
 * The entries of one section, keyed from inside it: `address.street` becomes
 * `street`. What a nested form of the section's fields is handed as its
 * errors or touched flags.
 */
export function sectionPathMap<T>(
  source: Record<string, T> | undefined,
  sectionName: string,
): Record<string, T> | undefined {
  if (source === undefined) {
    return undefined;
  }

  const scoped: Record<string, T> = {};
  const prefix = `${sectionName}.`;
  for (const [path, value] of Object.entries(source)) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      scoped[path.slice(prefix.length)] = value;
    }
  }
  return scoped;
}

/**
 * Index keys such as `contacts[2].email` by item number. Consumers can then
 * render every repeatable-group item without filtering the entire map once per
 * item.
 */
export function indexGroupPathMap<T>(
  source: Record<string, T> | undefined,
  groupName: string,
): Record<number, Record<string, T>> | undefined {
  if (source === undefined) {
    return undefined;
  }

  const indexed: Record<number, Record<string, T>> = {};
  const prefix = `${groupName}[`;
  for (const [path, value] of Object.entries(source)) {
    if (!path.startsWith(prefix)) {
      continue;
    }
    const suffix = path.slice(prefix.length);
    const separator = suffix.indexOf('].');
    if (separator < 1) {
      continue;
    }
    const index = Number(suffix.slice(0, separator));
    if (!Number.isInteger(index) || index < 0) {
      continue;
    }
    const childPath = suffix.slice(separator + 2);
    (indexed[index] ??= {})[childPath] = value;
  }
  return indexed;
}
