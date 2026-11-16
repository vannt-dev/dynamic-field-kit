import {
  focusFirstInvalidField,
  FieldDescription,
  Properties,
} from '@dynamic-field-kit/core';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { focusFieldById, listInvalidFields } from '../errorSummary';

const NO_DATA: Properties = Object.freeze({});
const NO_ERRORS: Record<string, string[]> = Object.freeze({});

/**
 * The slice of `useDynamicForm`'s result `ErrorSummary` reads. Structural, so
 * the hook result can be passed straight in.
 */
export interface ErrorSummaryFormBinding {
  data: Properties;
  errors: Record<string, string[]>;
  submitCount?: number;
}

/**
 * Whether the heading is a live region. `live`: it is, for the errors a
 * submit found. `spent`: those errors are gone (or the submit found none), so
 * a list that fills up again - a blur, a keystroke, an answer from the
 * server - must not speak. `armed`: no submit count to go by; the first list
 * to show is the one that is announced.
 */
type Announcement = 'armed' | 'live' | 'spent';

function announcementFor(
  submitCount: number | undefined,
  hasErrors: boolean,
): Announcement {
  if (submitCount === undefined) {
    return hasErrors ? 'live' : 'armed';
  }
  return submitCount > 0 && hasErrors ? 'live' : 'spent';
}

export interface ErrorSummaryProps {
  /** The field list the form renders. */
  fieldDescriptions: FieldDescription[];
  /**
   * The same `idPrefix` the form's `MultiFieldInput` is given. The links
   * point at `${idPrefix}-${name}`, so the two have to agree; without an
   * explicit prefix on both, a summary cannot know the ids of the fields.
   */
  idPrefix: string;
  /** Shorthand for `data`, `errors` and `submitCount` from `useDynamicForm`. */
  form?: ErrorSummaryFormBinding;
  data?: Properties;
  errors?: Record<string, string[]>;
  /**
   * How many submits have been attempted. When it is known (`form` carries
   * it), the summary stays out of the way until the first one, and is
   * announced by each one that finds errors. Without it the summary shows
   * whenever there are errors and is announced once, the first time.
   */
  submitCount?: number;
  /** The heading. It is what a screen reader announces on submit. */
  title?: string;
  /** The level of the heading element, `2` (an `<h2>`) by default. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * Where focus goes after a submit that found errors: the summary itself,
   * or the first invalid field. Left alone by default.
   */
  focusOnSubmit?: 'summary' | 'first-invalid';
  className?: string;
}

/**
 * The form's current validation errors as a list of links, each one moving
 * focus to its field.
 *
 * Only the heading sits in a live region (`role="alert"`), and only for the
 * errors a submit found; its text does not depend on them. Fixing a field
 * updates the list without a word from the screen reader, a list that fills
 * up again between two submits stays silent, and each new submit that finds
 * errors announces the heading again.
 */
const ErrorSummary = ({
  fieldDescriptions,
  idPrefix,
  form,
  data: dataProp,
  errors: errorsProp,
  submitCount: submitCountProp,
  title = 'There is a problem',
  headingLevel = 2,
  focusOnSubmit,
  className,
}: ErrorSummaryProps) => {
  const data = dataProp ?? form?.data ?? NO_DATA;
  const errors = errorsProp ?? form?.errors ?? NO_ERRORS;
  const submitCount = submitCountProp ?? form?.submitCount;

  const entries = useMemo(
    () =>
      listInvalidFields({ fields: fieldDescriptions, data, errors, idPrefix }),
    [fieldDescriptions, data, errors, idPrefix],
  );

  // Derived while rendering rather than in an effect, so the node that is
  // committed already has the right role: a live region announces when it is
  // added, and must not be added for a list no submit produced.
  const hasErrors = entries.length > 0;
  const [announced, setAnnounced] = useState(() => ({
    submitCount,
    state: announcementFor(submitCount, hasErrors),
  }));
  let announcement = announced.state;
  if (announced.submitCount !== submitCount) {
    announcement = announcementFor(submitCount, hasErrors);
  } else if (announcement === 'armed' && hasErrors) {
    announcement = 'live';
  } else if (announcement === 'live' && !hasErrors) {
    announcement = 'spent';
  }
  if (
    announcement !== announced.state ||
    announced.submitCount !== submitCount
  ) {
    setAnnounced({ submitCount, state: announcement });
  }

  const titleId = `dfk-${useId().replace(/[^a-zA-Z0-9]/g, '')}-error-summary`;
  const rootRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const focusOnSubmitRef = useRef(focusOnSubmit);
  focusOnSubmitRef.current = focusOnSubmit;

  // After the commit, not from the submit handler: by now the errors of this
  // submit are in the DOM, the summary included.
  useEffect(() => {
    const target = focusOnSubmitRef.current;
    const invalid = entriesRef.current;
    if (!target || !submitCount || invalid.length === 0) {
      return;
    }
    if (target === 'summary') {
      rootRef.current?.focus();
      return;
    }
    if (!invalid.some((entry) => focusFieldById(entry.id))) {
      // No field answers to its id (a custom renderer that does not forward
      // it): fall back to the first control marked invalid.
      focusFirstInvalidField(rootRef.current?.closest('form'));
    }
  }, [submitCount]);

  if (entries.length === 0 || submitCount === 0) {
    return null;
  }

  const Heading = `h${headingLevel}` as 'h2';

  return (
    <div
      ref={rootRef}
      className={['dfk-error-summary', className].filter(Boolean).join(' ')}
      role="group"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      {/* Remounted on every submit, so the same words are announced again. */}
      <div
        role={announcement === 'live' ? 'alert' : undefined}
        key={submitCount ?? 0}
      >
        <Heading id={titleId} className="dfk-error-summary-title">
          {title}
        </Heading>
      </div>
      <ul className="dfk-error-summary-list">
        {entries.map((entry) => {
          const text = (
            <>
              <span className="dfk-error-summary-label">{entry.label}</span>
              {': '}
              {entry.messages[0]}
            </>
          );
          return (
            <li key={entry.path}>
              {entry.id === undefined ? (
                text
              ) : (
                <a
                  href={`#${entry.id}`}
                  onClick={(event) => {
                    // Without a field to focus the link is left to the
                    // browser, which at least scrolls to the id.
                    if (focusFieldById(entry.id)) {
                      event.preventDefault();
                    }
                  }}
                >
                  {text}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ErrorSummary;
