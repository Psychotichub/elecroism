import { describe, expect, it } from 'vitest';
import {
  buildSnapshotRecord,
  formatSnapshotTime,
  shouldTakePeriodicSnapshot,
  snapshotToSummary,
  SNAPSHOT_INTERVAL_MS,
} from '../projectSnapshots';
import { createEmptyProject } from '../projectPersistence';

describe('projectSnapshots', () => {
  it('throttles periodic snapshots', () => {
    const now = 1_000_000;
    expect(shouldTakePeriodicSnapshot(0, now, SNAPSHOT_INTERVAL_MS)).toBe(true);
    expect(
      shouldTakePeriodicSnapshot(now - 1000, now, SNAPSHOT_INTERVAL_MS)
    ).toBe(false);
    expect(
      shouldTakePeriodicSnapshot(now - SNAPSHOT_INTERVAL_MS, now, SNAPSHOT_INTERVAL_MS)
    ).toBe(true);
  });

  it('builds snapshot records from projects', () => {
    const project = createEmptyProject('MCC');
    const record = buildSnapshotRecord(project, 'Before edit');
    expect(record.projectName).toBe('MCC');
    expect(record.label).toBe('Before edit');
    expect(record.document.version).toBe('2.0');
    const summary = snapshotToSummary(record);
    expect(summary.sheetCount).toBe(1);
    expect(summary.id).toBe(record.id);
  });

  it('formats snapshot timestamps', () => {
    expect(formatSnapshotTime('2026-06-07T12:00:00.000Z')).toContain('2026');
  });
});
