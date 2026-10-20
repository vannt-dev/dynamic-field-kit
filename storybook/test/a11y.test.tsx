import { composeStories } from '@storybook/react-vite';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import React from 'react';
import { describe, expect, it } from 'vitest';
import * as fieldTypes from '../src/stories/FieldTypes.stories';
import * as forms from '../src/stories/Forms.stories';
import * as wizard from '../src/stories/Wizard.stories';

// The same engine the Storybook a11y addon runs, over every story's DOM.
// jsdom does no layout, so the rules that need it (contrast) are left out;
// what is checked is the markup: names of controls, ARIA references, roles.
const all = {
  ...composeStories(fieldTypes),
  ...composeStories(forms),
  ...composeStories(wizard),
};

describe('accessibility of every story', () => {
  it.each(Object.entries(all))('%s', async (_name, Story) => {
    const { container } = render(<Story />);
    const result = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    const found = result.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    );
    expect(found).toEqual([]);
  });
});
