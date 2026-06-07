/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PanelDataTable from '../PanelDataTable';

describe('PanelDataTable', () => {
  it('renders zebra table with sticky header class', () => {
    render(
      <PanelDataTable minWidth={280}>
        <thead className="es-table-sticky-head">
          <tr>
            <th>Device</th>
            <th className="es-table-num">Iₙ (A)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MCB1</td>
            <td className="es-table-num">16</td>
          </tr>
        </tbody>
      </PanelDataTable>
    );
    const table = screen.getByTestId('panel-data-table').querySelector('table');
    expect(table?.className).toContain('es-table-zebra');
    expect(screen.getByText('Device').className).not.toContain('es-table-num');
    expect(screen.getByText('Iₙ (A)').className).toContain('es-table-num');
  });
});
