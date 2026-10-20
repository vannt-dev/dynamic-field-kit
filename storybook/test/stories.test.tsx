import { composeStories } from '@storybook/react-vite';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as fieldTypes from '../src/stories/FieldTypes.stories';
import * as forms from '../src/stories/Forms.stories';
import * as wizard from '../src/stories/Wizard.stories';

// A smoke test of every story: it renders, against the packages' source, the
// way the Storybook build will. Not a test of the kit itself - the packages
// have their own suites - but it catches a story that no longer compiles or
// throws on render after an API change.
const all = {
  ...composeStories(fieldTypes),
  ...composeStories(forms),
  ...composeStories(wizard),
};

describe('every story renders', () => {
  it.each(Object.entries(all))('%s', (_name, Story) => {
    const { container } = render(<Story />);
    expect(container.querySelector('input, textarea, select')).not.toBeNull();
  });
});

describe('field type stories', () => {
  it('render one control of their own type', () => {
    const { container } = render(<all.Checkbox />);
    expect(
      container.querySelectorAll('input[type="checkbox"]').length,
    ).toBeGreaterThan(0);
  });

  it('merge the controls over the shared field', () => {
    render(<all.Text placeholder="Given name" required disabled />);
    const input = screen.getByPlaceholderText('Given name') as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.disabled).toBe(true);
  });
});

describe('form stories', () => {
  it('show the validation messages on an empty submit', async () => {
    render(<all.Validation showDevTools={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('show the conditional field only when "Yes" is chosen', () => {
    const { container } = render(<all.Conditions />);
    expect(container.querySelector('[id$="-note"]')).toBeNull();
  });

  it('keep the wizard on a step that is not valid', () => {
    render(<all.ThreeSteps />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Email is required')).toBeTruthy();
  });
});
