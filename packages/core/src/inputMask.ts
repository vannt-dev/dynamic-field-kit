/**
 * How a field's value is shown while it is typed, and how the typed text is
 * read back into the value the form stores.
 *
 * The form keeps the stored value - validators, `computeValue`, drafts and
 * `onSubmit` never see the formatted text.
 */
export interface InputMask {
  /** The text to show for a stored value. */
  format: (value: unknown) => string;
  /**
   * The value to store for the text now in the input. `previous` is the value
   * the form held while that text was edited: a mask that adds characters of
   * its own needs it to tell a deleted separator from text that was merely
   * re-typed, since both parse to the value that was already there.
   */
  parse: (text: string, previous?: unknown) => unknown;
}

/**
 * A pattern such as `'(999) 999-9999'`, or a pair of functions for what a
 * pattern cannot say (thousands separators, upper-casing).
 *
 * In a pattern `9` is a digit, `a` a letter, `*` either, and any other
 * character is fixed. A backslash makes the next character fixed: `'\\9'` is a
 * literal 9.
 */
export type FieldMask = string | InputMask;

type Place = { fixed: string } | { fits: RegExp };

const PLACES = new Map<string, RegExp>([
  ['9', /\d/],
  ['a', /\p{L}/u],
  ['*', /[\p{L}\d]/u],
]);

function isFixed(place: Place): place is { fixed: string } {
  return 'fixed' in place;
}

function compile(pattern: string): Place[] {
  const chars = Array.from(pattern);
  const places: Place[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    if (chars[i] === '\\' && i + 1 < chars.length) {
      i += 1;
      places.push({ fixed: chars[i] });
      continue;
    }
    const fits = PLACES.get(chars[i]);
    places.push(fits ? { fits } : { fixed: chars[i] });
  }
  return places;
}

/**
 * Compiles a pattern into a mask. A stored value holds only what was typed
 * into the pattern's places: `'5551234567'` for `'(999) 999-9999'`.
 *
 * A fixed character is shown once the character after it exists, and the ones
 * that close the pattern once every place is filled, so an input never ends
 * in a separator that Backspace would have to fight.
 */
export function createInputMask(pattern: string): InputMask {
  const places = compile(pattern);
  const open = places.filter((place) => !isFixed(place)) as { fits: RegExp }[];

  // What a stored value contributes: its characters, each in the first place
  // it fits. A stored value has no fixed characters, so none are looked for.
  const typedIn = (value: unknown): string[] => {
    const typed: string[] = [];
    if (value === undefined || value === null) {
      return typed;
    }
    for (const char of String(value)) {
      if (typed.length === open.length) {
        break;
      }
      if (open[typed.length].fits.test(char)) {
        typed.push(char);
      }
    }
    return typed;
  };

  const layOut = (typed: string[]): string[] => {
    const shown: string[] = [];
    let fixed: string[] = [];
    let used = 0;
    for (const place of places) {
      if (isFixed(place)) {
        fixed.push(place.fixed);
      } else if (used < typed.length) {
        shown.push(...fixed, typed[used]);
        fixed = [];
        used += 1;
      } else {
        return shown;
      }
    }
    return typed.length > 0 ? [...shown, ...fixed] : shown;
  };

  // Text from an input does carry the fixed characters, so they are matched
  // rather than tried against a place: the 1 of '+1 (999)' is not a digit the
  // user typed.
  const read = (text: string[]): string[] => {
    const typed: string[] = [];
    let at = 0;
    for (let i = 0; i < places.length && at < text.length;) {
      const place = places[i];
      if (isFixed(place)) {
        if (text[at] === place.fixed) {
          at += 1;
        }
        i += 1;
      } else if (place.fits.test(text[at])) {
        typed.push(text[at]);
        at += 1;
        i += 1;
      } else {
        at += 1;
      }
    }
    return typed;
  };

  return {
    format: (value) => layOut(typedIn(value)).join(''),
    parse: (input, previous) => {
      const text = Array.from(input);
      const typed = read(text);
      const before = typedIn(previous);
      const shown = layOut(before);
      if (typed.join('') !== before.join('') || text.length >= shown.length) {
        return typed.join('');
      }

      // The text is shorter and every typed character is still there: what
      // went is a fixed character, which formatting would only put back. Take
      // the typed character before it instead, as Backspace means to.
      let kept = 0;
      while (kept < text.length && text[kept] === shown[kept]) {
        kept += 1;
      }
      const tail = text.slice(kept).join('');
      if (tail !== shown.slice(shown.length - (text.length - kept)).join('')) {
        // Not the shown text with a piece cut out: the same value pasted in
        // another layout.
        return typed.join('');
      }
      // `shown` has one character per place, in order.
      const typedBefore = places
        .slice(0, kept)
        .filter((place) => !isFixed(place)).length;
      if (typedBefore === 0) {
        return typed.join('');
      }
      before.splice(typedBefore - 1, 1);
      return before.join('');
    },
  };
}

const compiled = new Map<string, InputMask>();

/** The mask a field's `mask` stands for: a pattern is compiled once. */
export function resolveInputMask(
  mask: FieldMask | undefined,
): InputMask | undefined {
  if (typeof mask === 'string') {
    let known = compiled.get(mask);
    if (!known) {
      known = createInputMask(mask);
      compiled.set(mask, known);
    }
    return known;
  }
  return mask;
}
