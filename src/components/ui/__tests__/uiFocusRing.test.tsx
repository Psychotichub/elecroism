/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Button from '../Button';
import Chip from '../Chip';
import IconButton from '../IconButton';
import Input from '../Input';
import Select from '../Select';
import SegmentedControl from '../SegmentedControl';
import Textarea from '../Textarea';
import Tabs from '../Tabs';

describe('ui focus rings', () => {
  it('applies es-focus-ring to interactive primitives', () => {
    const cases: Array<{ name: string; html: string }> = [];

    const { container: button } = render(<Button>Save</Button>);
    cases.push({ name: 'Button', html: button.innerHTML });

    const { container: icon } = render(
      <IconButton label="Zoom in">+</IconButton>
    );
    cases.push({ name: 'IconButton', html: icon.innerHTML });

    const { container: input } = render(<Input aria-label="Name" />);
    cases.push({ name: 'Input', html: input.innerHTML });

    const { container: textarea } = render(<Textarea aria-label="Notes" />);
    cases.push({ name: 'Textarea', html: textarea.innerHTML });

    const { container: select } = render(
      <Select aria-label="Mode">
        <option>A</option>
      </Select>
    );
    cases.push({ name: 'Select', html: select.innerHTML });

    const { container: chip } = render(<Chip>All</Chip>);
    cases.push({ name: 'Chip', html: chip.innerHTML });

    const { container: segmented } = render(
      <SegmentedControl
        ariaLabel="Mode"
        value="a"
        onChange={() => undefined}
        items={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
      />
    );
    cases.push({ name: 'SegmentedControl', html: segmented.innerHTML });

    const { container: tabs } = render(
      <Tabs
        ariaLabel="Panels"
        value="one"
        onChange={() => undefined}
        items={[
          { id: 'one', label: 'One' },
          { id: 'two', label: 'Two' },
        ]}
      />
    );
    cases.push({ name: 'Tabs', html: tabs.innerHTML });

    for (const { name, html } of cases) {
      expect(html, `${name} should include es-focus-ring`).toContain(
        'es-focus-ring'
      );
    }
  });
});
