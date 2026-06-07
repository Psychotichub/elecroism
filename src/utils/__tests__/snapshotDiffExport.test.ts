import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../projectPersistence';
import { diffProjects } from '../projectSnapshotDiff';
import { formatSnapshotDiffReport } from '../snapshotDiffExport';

describe('snapshotDiffExport', () => {
  it('formats revision label in report header', () => {
    const base = createEmptyProject('Demo');
    const compare = structuredClone(base);
    const diff = diffProjects(base, compare, 'Rev A', 'Rev B');
    const text = formatSnapshotDiffReport(diff, 'Rev B');
    expect(text).toContain('Revision compare — Rev B');
    expect(text).toContain('Base: Rev A');
  });
});
