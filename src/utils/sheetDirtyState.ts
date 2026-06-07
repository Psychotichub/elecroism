import type { Circuit } from '../types';
import type { ElectroProject } from '../types/project';

/** Stable fingerprint of sheet content (excludes view state and timestamps). */
export function sheetCircuitFingerprint(circuit: Circuit): string {
  const components = [...circuit.components].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const wires = [...circuit.wires].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({
    id: circuit.id,
    name: circuit.name,
    gridSize: circuit.gridSize,
    createdAt: circuit.createdAt,
    designatorScheme: circuit.designatorScheme,
    designatorLocation: circuit.designatorLocation,
    phaseImbalanceWarningPercent: circuit.phaseImbalanceWarningPercent,
    wireLabelsVisible: circuit.wireLabelsVisible,
    continuityPowerThresholdW: circuit.continuityPowerThresholdW,
    drawingProject: circuit.drawingProject,
    drawingNumber: circuit.drawingNumber,
    drawingRevision: circuit.drawingRevision,
    drawnBy: circuit.drawnBy,
    checkedBy: circuit.checkedBy,
    approvedBy: circuit.approvedBy,
    drawingScale: circuit.drawingScale,
    revisionHistory: circuit.revisionHistory,
    drawingSheets: circuit.drawingSheets,
    reviewComments: circuit.reviewComments,
    components,
    wires,
  });
}

export function establishSheetSaveBaselines(
  project: ElectroProject
): Record<string, string> {
  const baselines: Record<string, string> = {};
  for (const sheet of project.sheets) {
    baselines[sheet.id] = sheetCircuitFingerprint(sheet.circuit);
  }
  return baselines;
}

export function isSheetDirty(
  sheetId: string,
  project: ElectroProject,
  liveCircuit: Circuit,
  baselines: Record<string, string>
): boolean {
  const baseline = baselines[sheetId];
  if (!baseline) return true;
  const sheet = project.sheets.find((s) => s.id === sheetId);
  if (!sheet) return false;
  const circuit =
    sheetId === project.activeSheetId ? liveCircuit : sheet.circuit;
  return sheetCircuitFingerprint(circuit) !== baseline;
}

export function isAnySheetDirty(
  project: ElectroProject,
  liveCircuit: Circuit,
  baselines: Record<string, string>
): boolean {
  return project.sheets.some((sheet) =>
    isSheetDirty(sheet.id, project, liveCircuit, baselines)
  );
}
