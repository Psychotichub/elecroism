import type { Circuit, CircuitComponent, DrawingSheet, Wire } from '../types';
import type { CircuitValidationIssue } from './circuitDesignValidation';
import type { ElectroProject, ProjectSheet } from '../types/project';
import {
  boundsForComponents,
  computeDrawingContentBounds,
  normalizeBounds,
  type WorldBounds,
} from './drawingBounds';

/** Parsed cross-sheet reference such as `=Sheet2!` or `=Sheet2!Q1`. */
export type CrossSheetRef = {
  raw: string;
  sheetName: string;
  /** Optional designator or drawing-region tag on the target sheet. */
  target?: string;
};

export type CrossSheetReferenceOccurrence = {
  parsed: CrossSheetRef;
  fromSheetId: string;
  fromSheetName: string;
  componentId?: string;
  componentLabel?: string;
  wireId?: string;
  field: string;
};

export type CrossSheetBacklink = CrossSheetReferenceOccurrence;

const CROSS_SHEET_REF_RE = /^=([^!]+)!(.*)$/;

export function normalizeSheetRefName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

/** Parse a full cross-sheet reference string. */
export function parseCrossSheetReference(text: string): CrossSheetRef | null {
  const trimmed = text.trim();
  const match = CROSS_SHEET_REF_RE.exec(trimmed);
  if (!match) return null;
  const sheetName = match[1].trim();
  const targetRaw = match[2].trim();
  if (!sheetName) return null;
  return {
    raw: trimmed,
    sheetName,
    target: targetRaw || undefined,
  };
}

/** Extract cross-sheet refs embedded in free text. */
export function extractCrossSheetReferences(text: string): CrossSheetRef[] {
  const out: CrossSheetRef[] = [];
  const re = /=([A-Za-z0-9][A-Za-z0-9 _.-]*)!([A-Za-z0-9_.-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const parsed = parseCrossSheetReference(`=${m[1]}!${m[2] ?? ''}`);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function findProjectSheetByName(
  project: ElectroProject,
  sheetName: string
): ProjectSheet | null {
  const key = normalizeSheetRefName(sheetName);
  return (
    project.sheets.find(
      (s) => normalizeSheetRefName(s.name) === key
    ) ?? null
  );
}

function boundsForDrawingSheet(
  circuit: Circuit,
  sheet: DrawingSheet
): WorldBounds | null {
  if (
    sheet.minX != null &&
    sheet.minY != null &&
    sheet.maxX != null &&
    sheet.maxY != null
  ) {
    return normalizeBounds({
      minX: sheet.minX,
      minY: sheet.minY,
      maxX: sheet.maxX,
      maxY: sheet.maxY,
    });
  }
  if (sheet.componentIds && sheet.componentIds.length > 0) {
    return boundsForComponents(circuit, sheet.componentIds);
  }
  return computeDrawingContentBounds(circuit);
}

function matchDrawingRegion(
  circuit: Circuit,
  target: string
): DrawingSheet | null {
  const key = target.replace(/^=/, '').trim().toLowerCase();
  if (!key) return null;
  return (
    (circuit.drawingSheets ?? []).find((s) => {
      const ref = s.reference.trim().toLowerCase();
      const bare = ref.replace(/^=/, '');
      return bare === key || ref === target.trim().toLowerCase();
    }) ?? null
  );
}

function matchComponentByDesignator(
  circuit: Circuit,
  target: string
): CircuitComponent | null {
  const key = target.replace(/^=/, '').trim().toLowerCase();
  if (!key) return null;
  return (
    circuit.components.find(
      (c) => c.label.trim().toLowerCase() === key
    ) ?? null
  );
}

/** Resolve framing bounds for a target on a sheet circuit. */
export function resolveCrossSheetTargetBounds(
  circuit: Circuit,
  target?: string
): WorldBounds | null {
  if (!target) {
    return computeDrawingContentBounds(circuit);
  }
  const comp = matchComponentByDesignator(circuit, target);
  if (comp) {
    return boundsForComponents(circuit, [comp.id]);
  }
  const region = matchDrawingRegion(circuit, target);
  if (region) {
    return boundsForDrawingSheet(circuit, region);
  }
  return null;
}

function visitStringField(
  value: string | undefined,
  ctx: Omit<CrossSheetReferenceOccurrence, 'parsed' | 'field'>,
  field: string,
  out: CrossSheetReferenceOccurrence[]
): void {
  if (!value?.trim()) return;
  const trimmed = value.trim();
  const full = parseCrossSheetReference(trimmed);
  if (full) {
    out.push({ ...ctx, field, parsed: full });
    return;
  }
  for (const parsed of extractCrossSheetReferences(trimmed)) {
    out.push({ ...ctx, field, parsed });
  }
}

/** Collect outgoing cross-sheet references from one sheet circuit. */
export function collectCrossSheetReferences(
  circuit: Circuit,
  fromSheetId: string,
  fromSheetName: string
): CrossSheetReferenceOccurrence[] {
  const out: CrossSheetReferenceOccurrence[] = [];

  for (const comp of circuit.components) {
    const ctx = {
      fromSheetId,
      fromSheetName,
      componentId: comp.id,
      componentLabel: comp.label,
    };
    visitStringField(comp.label, ctx, 'label', out);
    visitStringField(comp.properties.crossSheetRef, ctx, 'crossSheetRef', out);
  }

  for (const wire of circuit.wires) {
    const ctx = {
      fromSheetId,
      fromSheetName,
      wireId: wire.id,
    };
    visitStringField(wire.sourceTag, ctx, 'sourceTag', out);
    visitStringField(wire.destinationTag, ctx, 'destinationTag', out);
    visitStringField(wire.wireLabel, ctx, 'wireLabel', out);
    visitStringField(wire.wireNumber, ctx, 'wireNumber', out);
  }

  return out;
}

/** Incoming references that point at the given project sheet. */
export function collectBacklinksToSheet(
  project: ElectroProject,
  targetSheetId: string
): CrossSheetBacklink[] {
  const target = project.sheets.find((s) => s.id === targetSheetId);
  if (!target) return [];

  const key = normalizeSheetRefName(target.name);
  const out: CrossSheetBacklink[] = [];

  for (const sheet of project.sheets) {
    if (sheet.id === targetSheetId) continue;
    for (const ref of collectCrossSheetReferences(
      sheet.circuit,
      sheet.id,
      sheet.name
    )) {
      if (normalizeSheetRefName(ref.parsed.sheetName) === key) {
        out.push(ref);
      }
    }
  }

  return out;
}

export function validateCrossSheetReferences(
  project: ElectroProject
): CircuitValidationIssue[] {
  const issues: CircuitValidationIssue[] = [];
  let idx = 0;

  for (const sheet of project.sheets) {
    for (const ref of collectCrossSheetReferences(
      sheet.circuit,
      sheet.id,
      sheet.name
    )) {
      const targetSheet = findProjectSheetByName(project, ref.parsed.sheetName);
      const componentIds = ref.componentId ? [ref.componentId] : [];

      if (!targetSheet) {
        issues.push({
          id: `cross-sheet-missing-${idx++}`,
          severity: 'warning',
          message: `Broken cross-sheet reference ${ref.parsed.raw}: sheet “${ref.parsed.sheetName}” was not found`,
          componentIds,
        });
        continue;
      }

      if (ref.parsed.target) {
        const bounds = resolveCrossSheetTargetBounds(
          targetSheet.circuit,
          ref.parsed.target
        );
        if (!bounds) {
          issues.push({
            id: `cross-sheet-target-${idx++}`,
            severity: 'warning',
            message: `Broken cross-sheet reference ${ref.parsed.raw}: “${ref.parsed.target}” not found on ${targetSheet.name}`,
            componentIds,
          });
        }
      }
    }
  }

  return issues;
}

export function viewportForBounds(
  bounds: WorldBounds
): { zoom: number; panX: number; panY: number } {
  const minX = bounds.minX;
  const maxX = bounds.maxX;
  const minY = bounds.minY;
  const maxY = bounds.maxY;
  const worldW = Math.max(120, maxX - minX);
  const worldH = Math.max(120, maxY - minY);
  const viewportW =
    typeof window !== 'undefined' ? window.innerWidth * 0.55 : 900;
  const viewportH =
    typeof window !== 'undefined' ? window.innerHeight * 0.65 : 600;
  const fitZoom = Math.max(
    0.35,
    Math.min(2.5, Math.min(viewportW / worldW, viewportH / worldH))
  );
  const panX = viewportW * 0.5 - ((minX + maxX) * 0.5) * fitZoom;
  const panY = viewportH * 0.5 - ((minY + maxY) * 0.5) * fitZoom;
  return { zoom: fitZoom, panX, panY };
}

/** Whether a wire field contains a navigable cross-sheet reference. */
export function wireHasCrossSheetRef(wire: Wire): boolean {
  return (
    Boolean(parseCrossSheetReference(wire.sourceTag ?? '')) ||
    Boolean(parseCrossSheetReference(wire.destinationTag ?? '')) ||
    Boolean(parseCrossSheetReference(wire.wireLabel ?? '')) ||
    extractCrossSheetReferences(wire.sourceTag ?? '').length > 0 ||
    extractCrossSheetReferences(wire.destinationTag ?? '').length > 0 ||
    extractCrossSheetReferences(wire.wireLabel ?? '').length > 0
  );
}
