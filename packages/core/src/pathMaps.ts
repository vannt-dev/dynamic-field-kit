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
