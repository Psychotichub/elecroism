/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Tabs from '../Tabs';

describe('Tabs overflow', () => {
  it('renders primary tabs and an Analysis overflow trigger', () => {
    render(
      <Tabs
        items={[
          { id: 'properties', label: 'Properties' },
          { id: 'validation', label: 'Validation', badge: 2 },
        ]}
        overflowItems={[{ id: 'tcc', label: 'TCC' }]}
        overflowMenuLabel="Analysis"
        value="properties"
        onChange={vi.fn()}
        ariaLabel="Inspector panels"
      />
    );
    expect(screen.getByRole('tab', { name: 'Properties' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Validation' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'TCC' })).toBeNull();
    expect(screen.getByTestId('tab-overflow-trigger')).toBeTruthy();
  });

  it('opens overflow menu and switches tabs', () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={[{ id: 'properties', label: 'Properties' }]}
        overflowItems={[
          { id: 'tcc', label: 'TCC' },
          { id: 'scope', label: 'Scope' },
        ]}
        value="properties"
        onChange={onChange}
        ariaLabel="Inspector panels"
      />
    );
    fireEvent.click(screen.getByTestId('tab-overflow-trigger'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Scope' }));
    expect(onChange).toHaveBeenCalledWith('scope');
  });

  it('shows compactLabel on primary tabs when compact', () => {
    render(
      <Tabs
        items={[
          {
            id: 'properties',
            label: 'Properties',
            compactLabel: 'M1 · Motor',
          },
        ]}
        value="properties"
        onChange={vi.fn()}
        ariaLabel="Inspector panels"
        compact
      />
    );
    const tab = screen.getByRole('tab', { name: 'Properties — M1 · Motor' });
    expect(within(tab).getByText('M1 · Motor')).toBeTruthy();
  });
});
