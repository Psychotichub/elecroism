import type { ProjectSnapshotDiff } from './projectSnapshotDiff';

export function formatSnapshotDiffReport(
  diff: ProjectSnapshotDiff,
  revisionLabel?: string
): string {
  const lines: string[] = [];
  const title = revisionLabel?.trim()
    ? `Revision compare — ${revisionLabel.trim()}`
    : 'Revision compare';
  lines.push(title);
  lines.push(`Base: ${diff.baseLabel}`);
  lines.push(`Compare: ${diff.compareLabel}`);
  lines.push('');
  lines.push('Summary');
  lines.push(`  Sheets added: ${diff.summary.sheetsAdded}`);
  lines.push(`  Sheets removed: ${diff.summary.sheetsRemoved}`);
  lines.push(`  Components added: ${diff.summary.componentsAdded}`);
  lines.push(`  Components removed: ${diff.summary.componentsRemoved}`);
  lines.push(`  Components moved: ${diff.summary.componentsMoved}`);
  lines.push(`  Components modified: ${diff.summary.componentsModified}`);
  lines.push(`  Wires added: ${diff.summary.wiresAdded}`);
  lines.push(`  Wires removed: ${diff.summary.wiresRemoved}`);
  lines.push(`  Wires modified: ${diff.summary.wiresModified}`);
  lines.push('');

  for (const sheet of diff.sheets) {
    const hasChanges =
      sheet.sheetAdded ||
      sheet.sheetRemoved ||
      sheet.components.length > 0 ||
      sheet.wires.length > 0;
    if (!hasChanges) continue;

    lines.push(`Sheet: ${sheet.sheetName}`);
    if (sheet.sheetAdded) lines.push('  (sheet added)');
    if (sheet.sheetRemoved) lines.push('  (sheet removed)');

    for (const c of sheet.components) {
      const pos =
        c.after != null
          ? ` @ (${c.after.x}, ${c.after.y})`
          : c.before != null
            ? ` @ (${c.before.x}, ${c.before.y})`
            : '';
      lines.push(
        `  [${c.change}] ${c.label} (${c.componentType})${pos}${
          c.detail ? ` — ${c.detail}` : ''
        }`
      );
    }
    for (const w of sheet.wires) {
      lines.push(
        `  [${w.change}] wire ${w.wireKey}${w.detail ? ` — ${w.detail}` : ''}`
      );
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function downloadSnapshotDiffReport(
  diff: ProjectSnapshotDiff,
  revisionLabel?: string,
  fileBase = 'revision-compare'
): void {
  const text = formatSnapshotDiffReport(diff, revisionLabel);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safe = fileBase.replace(/[^\w-]+/g, '_').slice(0, 60);
  link.download = `${safe}.txt`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
