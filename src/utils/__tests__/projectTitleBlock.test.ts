import { describe, expect, it } from 'vitest';
import type { Circuit } from '../../types';
import { createEmptyProject } from '../projectPersistence';
import {
  applyProjectTitleBlock,
  appendRevisionHistoryEntry,
  migrateProjectTitleBlock,
  resolvedProjectTitleBlock,
} from '../projectTitleBlock';
import { buildTitleBlock } from '../drawingExport';
import { makeCircuit } from '../../simulation/__tests__/testHelpers';

describe('projectTitleBlock', () => {
  it('migrates legacy per-sheet drawing fields to project title block', () => {
    const project = createEmptyProject('Test');
    const sheet = project.sheets[0];
    sheet.circuit = {
      ...sheet.circuit,
      drawingProject: 'Site B',
      drawingNumber: 'EL-200',
      drawingRevision: 'C',
      drawnBy: 'AB',
      checkedBy: 'CD',
    };
    const migrated = migrateProjectTitleBlock(project);
    expect(migrated.titleBlock?.client).toBe('Site B');
    expect(migrated.titleBlock?.drawingNumber).toBe('EL-200');
    expect(migrated.titleBlock?.revision).toBe('C');
  });

  it('applies title block patch to every sheet circuit', () => {
    const base = createEmptyProject('Multi');
    const project = {
      ...base,
      sheets: [
        ...base.sheets,
        {
          id: 'sheet-2',
          name: 'Sheet 2',
          sortOrder: 1,
          circuit: {
            ...base.sheets[0].circuit,
            name: 'Sheet 2',
          },
        },
      ],
    };
    const updated = applyProjectTitleBlock(project, {
      client: 'Client X',
      drawingNumber: 'DWG-99',
      revision: 'B',
      scale: '1:50',
      approvedBy: 'PM',
    });
    for (const sheet of updated.sheets) {
      expect(sheet.circuit.drawingProject).toBe('Client X');
      expect(sheet.circuit.drawingNumber).toBe('DWG-99');
      expect(sheet.circuit.drawingRevision).toBe('B');
      expect(sheet.circuit.drawingScale).toBe('1:50');
      expect(sheet.circuit.approvedBy).toBe('PM');
    }
    expect(updated.titleBlock?.client).toBe('Client X');
  });

  it('appends revision history and bumps revision', () => {
    const project = createEmptyProject('Rev test');
    const next = appendRevisionHistoryEntry(project, {
      revision: 'B',
      date: '2026-06-07',
      description: 'Issued for construction',
      drawnBy: 'JD',
    });
    expect(next.titleBlock?.revision).toBe('B');
    expect(next.titleBlock?.revisionHistory).toHaveLength(1);
    expect(next.sheets[0].circuit.revisionHistory).toHaveLength(1);
  });

  it('resolves project title block over circuit legacy fields', () => {
    const project = applyProjectTitleBlock(createEmptyProject('P'), {
      client: 'Project client',
      drawingNumber: 'P-001',
      revision: 'A',
      scale: 'NTS',
    });
    const circuit: Circuit = {
      ...makeCircuit([], []),
      drawingProject: 'Old client',
      drawingNumber: 'OLD',
      drawingRevision: 'Z',
    };
    const resolved = resolvedProjectTitleBlock(project, circuit);
    expect(resolved.client).toBe('Project client');
    expect(resolved.drawingNumber).toBe('P-001');
    expect(resolved.revision).toBe('A');
  });

  it('buildTitleBlock uses project title block for export metadata', () => {
    const project = applyProjectTitleBlock(createEmptyProject('Export'), {
      client: 'Acme Ltd',
      drawingNumber: 'EL-500',
      revision: 'D',
      scale: '1:100',
      approvedBy: 'Director',
      revisionHistory: [
        {
          revision: 'D',
          date: '2026-06-07',
          description: 'As-built',
        },
      ],
    });
    const circuit = {
      ...makeCircuit([], []),
      name: 'Feeder',
      drawingProject: 'ignored',
    };
    const tb = buildTitleBlock(circuit, project);
    expect(tb.project).toBe('Acme Ltd');
    expect(tb.drawingNumber).toBe('EL-500');
    expect(tb.revision).toBe('D');
    expect(tb.scale).toBe('1:100');
    expect(tb.approvedBy).toBe('Director');
    expect(tb.revisionHistory).toHaveLength(1);
  });
});
