import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  DefaultDateRenderer,
  DefaultDateTimeLocalRenderer,
  DefaultFileRenderer,
  DefaultRadioRenderer,
  DefaultRangeRenderer,
  DefaultSelectRenderer,
  DefaultSwitchRenderer,
  DefaultTimeRenderer,
  defaultRenderersMap,
  getDefaultRenderer,
} from '../src/defaultRenderers';

describe('date/time renderers', () => {
  it.each([
    ['date', DefaultDateRenderer],
    ['time', DefaultTimeRenderer],
    ['datetime-local', DefaultDateTimeLocalRenderer],
  ])('renders an input of type %s', (type, Renderer) => {
    const { container } = render(<Renderer value="" id="f" />);

    expect(container.querySelector('input')).toHaveAttribute('type', type);
  });

  it('emits the raw string value on change', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <DefaultTimeRenderer value="" onValueChange={onValueChange} />,
    );

    fireEvent.change(container.querySelector('input')!, {
      target: { value: '10:30' },
    });

    expect(onValueChange).toHaveBeenCalledWith('10:30');
  });
});

describe('DefaultSwitchRenderer', () => {
  it('renders a checkbox reflecting the value', () => {
    const { container } = render(<DefaultSwitchRenderer value={true} />);

    const input = container.querySelector('input')!;
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input).toBeChecked();
  });

  it('emits the checked state', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <DefaultSwitchRenderer value={false} onValueChange={onValueChange} />,
    );

    fireEvent.click(container.querySelector('input')!);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

describe('DefaultFileRenderer', () => {
  function fileInput(props: Record<string, unknown> = {}) {
    const { container } = render(<DefaultFileRenderer {...props} />);
    return container.querySelector('input')!;
  }

  it('emits a single File by default', () => {
    const onValueChange = vi.fn();
    const input = fileInput({ onValueChange });
    const file = new File(['x'], 'a.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onValueChange).toHaveBeenCalledWith(file);
  });

  it('emits an array when multiple is set', () => {
    const onValueChange = vi.fn();
    const input = fileInput({ onValueChange, multiple: true });
    const a = new File(['a'], 'a.txt');
    const b = new File(['b'], 'b.txt');

    fireEvent.change(input, { target: { files: [a, b] } });

    expect(onValueChange).toHaveBeenCalledWith([a, b]);
  });

  it('emits null when a single selection is cleared', () => {
    const onValueChange = vi.fn();
    const input = fileInput({ onValueChange });

    fireEvent.change(input, { target: { files: [] } });

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('forwards accept and multiple', () => {
    const input = fileInput({ accept: '.png', multiple: true });

    expect(input).toHaveAttribute('accept', '.png');
    expect(input).toHaveAttribute('multiple');
  });
});

describe('option-shaped fallbacks', () => {
  it('falls back to id/name when a select option has no value/label', () => {
    render(
      <DefaultSelectRenderer
        value="1"
        options={[{ id: '1', name: 'One' }]}
        id="sel"
      />,
    );

    expect(screen.getByRole('option', { name: 'One' })).toHaveValue('1');
  });

  it('falls back to id/name when a radio option has no value/label', () => {
    render(
      <DefaultRadioRenderer
        value="1"
        options={[{ id: '1', name: 'One' }]}
        id="rad"
      />,
    );

    expect(screen.getByLabelText('One')).toBeChecked();
  });

  it('treats a readOnly select as disabled', () => {
    render(<DefaultSelectRenderer value="" options={[]} readOnly id="sel" />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});

describe('DefaultRangeRenderer', () => {
  it('falls back to min when no value is set', () => {
    render(<DefaultRangeRenderer min={5} max={10} id="r" />);

    expect(screen.getByRole('slider')).toHaveValue('5');
  });

  it('emits a number on change', () => {
    const onValueChange = vi.fn();
    render(
      <DefaultRangeRenderer
        value={5}
        min={0}
        max={10}
        onValueChange={onValueChange}
        id="r"
      />,
    );

    fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } });

    expect(onValueChange).toHaveBeenCalledWith(7);
  });
});

describe('getDefaultRenderer', () => {
  it('resolves every registered type', () => {
    for (const type of Object.keys(defaultRenderersMap)) {
      expect(getDefaultRenderer(type)).toBe(defaultRenderersMap[type]);
    }
  });

  it('returns undefined for an unknown type', () => {
    expect(getDefaultRenderer('nope')).toBeUndefined();
  });
});
