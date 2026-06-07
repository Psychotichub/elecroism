import type { Circuit } from '../types';
import type {
  ElectroProject,
  ProjectTitleBlock,
  RevisionHistoryEntry,
} from '../types/project';
import { activeSheetCircuit } from './projectPersistence';

export function migrateProjectTitleBlock(
  project: ElectroProject
): ElectroProject {
  if (project.titleBlock) return project;
  const active = activeSheetCircuit(project);
  if (!active) return project;
  const hasLegacy =
    active.drawingProject ||
    active.drawingNumber ||
    active.drawingRevision ||
    active.drawnBy ||
    active.checkedBy ||
    active.approvedBy ||
    active.drawingScale;
  if (!hasLegacy) return project;
  return {
    ...project,
    titleBlock: {
      client: active.drawingProject,
      drawingNumber: active.drawingNumber,
      revision: active.drawingRevision,
      scale: active.drawingScale,
      drawnBy: active.drawnBy,
      checkedBy: active.checkedBy,
      approvedBy: active.approvedBy,
      revisionHistory: active.revisionHistory,
    },
  };
}

function syncCircuitTitleFields(
  circuit: Circuit,
  block: ProjectTitleBlock
): Circuit {
  return {
    ...circuit,
    drawingProject: block.client,
    drawingNumber: block.drawingNumber,
    drawingRevision: block.revision,
    drawingScale: block.scale,
    drawnBy: block.drawnBy,
    checkedBy: block.checkedBy,
    approvedBy: block.approvedBy,
    revisionHistory: block.revisionHistory,
    updatedAt: new Date().toISOString(),
  };
}

/** Apply project title block metadata to every sheet circuit. */
export function applyProjectTitleBlock(
  project: ElectroProject,
  patch: Partial<ProjectTitleBlock>
): ElectroProject {
  const titleBlock: ProjectTitleBlock = {
    ...project.titleBlock,
    ...patch,
    revisionHistory:
      patch.revisionHistory ?? project.titleBlock?.revisionHistory,
  };
  const now = new Date().toISOString();
  return {
    ...project,
    updatedAt: now,
    titleBlock,
    sheets: project.sheets.map((sheet) => ({
      ...sheet,
      circuit: syncCircuitTitleFields(sheet.circuit, titleBlock),
    })),
  };
}

export function appendRevisionHistoryEntry(
  project: ElectroProject,
  entry: RevisionHistoryEntry
): ElectroProject {
  const history = [...(project.titleBlock?.revisionHistory ?? []), entry];
  return applyProjectTitleBlock(project, {
    revision: entry.revision || project.titleBlock?.revision,
    revisionHistory: history,
  });
}

export function resolvedProjectTitleBlock(
  project: ElectroProject,
  circuit: Circuit
): ProjectTitleBlock {
  const block = project.titleBlock ?? {};
  return {
    brandName: block.brandName?.trim() || project.name,
    logoUrl: block.logoUrl,
    client:
      block.client?.trim() ||
      circuit.drawingProject?.trim() ||
      project.name,
    drawingNumber:
      block.drawingNumber?.trim() ||
      circuit.drawingNumber?.trim() ||
      circuit.name ||
      'DRG-001',
    revision: block.revision?.trim() || circuit.drawingRevision?.trim() || 'A',
    scale: block.scale?.trim() || circuit.drawingScale?.trim() || 'NTS',
    drawnBy: block.drawnBy?.trim() || circuit.drawnBy?.trim() || '—',
    checkedBy: block.checkedBy?.trim() || circuit.checkedBy?.trim() || '—',
    approvedBy:
      block.approvedBy?.trim() || circuit.approvedBy?.trim() || '—',
    revisionHistory:
      block.revisionHistory ?? circuit.revisionHistory ?? [],
  };
}
