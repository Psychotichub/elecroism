import type { Circuit, CircuitComponent, Wire } from '../types';
import type { ElectroProject, ProjectSheet } from '../types/project';
import { normalizeSheetRefName } from './crossSheetNavigation';

export type SnapshotChangeKind = 'added' | 'removed' | 'moved' | 'modified';

export type SnapshotComponentChange = {
  kind: 'component';
  change: SnapshotChangeKind;
  sheetName: string;
  label: string;
  componentType: string;
  detail?: string;
  before?: { x: number; y: number };
  after?: { x: number; y: number };
};

export type SnapshotWireChange = {
  kind: 'wire';
  change: SnapshotChangeKind;
  sheetName: string;
  wireKey: string;
  detail?: string;
  points?: number[];
  beforePoints?: number[];
};

export type SnapshotSheetDiff = {
  sheetName: string;
  sheetAdded: boolean;
  sheetRemoved: boolean;
  components: SnapshotComponentChange[];
  wires: SnapshotWireChange[];
};

export type ProjectSnapshotDiff = {
  baseLabel: string;
  compareLabel: string;
  sheets: SnapshotSheetDiff[];
  summary: {
    sheetsAdded: number;
    sheetsRemoved: number;
    componentsAdded: number;
    componentsRemoved: number;
    componentsMoved: number;
    componentsModified: number;
    wiresAdded: number;
    wiresRemoved: number;
    wiresModified: number;
  };
};

export type SnapshotSheetVisualDiff = {
  baseLabel: string;
  compareLabel: string;
  sheetName: string;
  added: Array<{ label: string; x: number; y: number }>;
  removed: Array<{ label: string; x: number; y: number }>;
  moved: Array<{
    label: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }>;
  modified: Array<{ label: string; x: number; y: number; detail: string }>;
  wiresAdded: number;
  wiresRemoved: number;
  wiresModified: number;
  wires: Array<{
    change: SnapshotChangeKind;
    wireKey: string;
    points: number[];
    beforePoints?: number[];
  }>;
};

export type ProjectSnapshotCompareResult = {
  diff: ProjectSnapshotDiff;
  baseProject: ElectroProject;
};

export function circuitForProjectSheet(
  project: ElectroProject,
  sheetName: string
): Circuit | null {
  const sheet = project.sheets.find(
    (s) => sheetKey(s.name) === sheetKey(sheetName)
  );
  return sheet?.circuit ?? null;
}

function sheetKey(name: string): string {
  return normalizeSheetRefName(name);
}

function componentKey(c: CircuitComponent): string {
  return `${c.type}::${c.label.trim().toLowerCase()}`;
}

function wireKey(circuit: Circuit, wire: Wire): string {
  const from = circuit.components.find((c) => c.id === wire.fromComponentId);
  const to = circuit.components.find((c) => c.id === wire.toComponentId);
  const fromPt =
    from?.connectionPoints.find((p) => p.id === wire.fromPointId)?.label ?? '?';
  const toPt =
    to?.connectionPoints.find((p) => p.id === wire.toPointId)?.label ?? '?';
  const num = wire.wireNumber?.trim();
  if (num) return num;
  return `${from?.label ?? '?'}:${fromPt}→${to?.label ?? '?'}:${toPt}`;
}

function componentFingerprint(c: CircuitComponent): string {
  return JSON.stringify({
    state: c.state,
    rotation: c.rotation,
    scale: c.scale ?? 1,
    drawingLayer: c.drawingLayer,
    props: c.properties,
  });
}

function wireFingerprint(wire: Wire): string {
  return JSON.stringify({
    points: wire.points,
    color: wire.color,
    crossSection: wire.crossSection,
    styleLayer: wire.styleLayer,
    wireLabel: wire.wireLabel,
    sourceTag: wire.sourceTag,
    destinationTag: wire.destinationTag,
  });
}

function movedThreshold(gridSize: number): number {
  return Math.max(4, gridSize);
}

function diffSheetCircuits(
  sheetName: string,
  base: Circuit | null,
  compare: Circuit | null,
  sheetAdded: boolean,
  sheetRemoved: boolean
): SnapshotSheetDiff {
  const components: SnapshotComponentChange[] = [];
  const wires: SnapshotWireChange[] = [];

  if (sheetAdded && compare) {
    for (const c of compare.components) {
      components.push({
        kind: 'component',
        change: 'added',
        sheetName,
        label: c.label,
        componentType: c.type,
        after: { x: c.x, y: c.y },
      });
    }
    for (const w of compare.wires) {
      wires.push({
        kind: 'wire',
        change: 'added',
        sheetName,
        wireKey: wireKey(compare, w),
        points: [...w.points],
      });
    }
    return { sheetName, sheetAdded, sheetRemoved, components, wires };
  }

  if (sheetRemoved && base) {
    for (const c of base.components) {
      components.push({
        kind: 'component',
        change: 'removed',
        sheetName,
        label: c.label,
        componentType: c.type,
        before: { x: c.x, y: c.y },
      });
    }
    for (const w of base.wires) {
      wires.push({
        kind: 'wire',
        change: 'removed',
        sheetName,
        wireKey: wireKey(base, w),
        points: [...w.points],
      });
    }
    return { sheetName, sheetAdded, sheetRemoved, components, wires };
  }

  if (!base || !compare) {
    return { sheetName, sheetAdded, sheetRemoved, components, wires };
  }

  const grid = compare.gridSize || base.gridSize || 20;
  const moveTol = movedThreshold(grid);

  const baseComps = new Map(base.components.map((c) => [componentKey(c), c]));
  const compareComps = new Map(
    compare.components.map((c) => [componentKey(c), c])
  );

  for (const [key, c] of compareComps) {
    const prev = baseComps.get(key);
    if (!prev) {
      components.push({
        kind: 'component',
        change: 'added',
        sheetName,
        label: c.label,
        componentType: c.type,
        after: { x: c.x, y: c.y },
      });
      continue;
    }
    const dx = Math.abs(c.x - prev.x);
    const dy = Math.abs(c.y - prev.y);
    if (dx > moveTol || dy > moveTol) {
      components.push({
        kind: 'component',
        change: 'moved',
        sheetName,
        label: c.label,
        componentType: c.type,
        before: { x: prev.x, y: prev.y },
        after: { x: c.x, y: c.y },
        detail: `Δx ${c.x - prev.x}, Δy ${c.y - prev.y}`,
      });
    } else if (componentFingerprint(c) !== componentFingerprint(prev)) {
      components.push({
        kind: 'component',
        change: 'modified',
        sheetName,
        label: c.label,
        componentType: c.type,
        after: { x: c.x, y: c.y },
        detail: 'Properties or state changed',
      });
    }
  }

  for (const [key, c] of baseComps) {
    if (!compareComps.has(key)) {
      components.push({
        kind: 'component',
        change: 'removed',
        sheetName,
        label: c.label,
        componentType: c.type,
        before: { x: c.x, y: c.y },
      });
    }
  }

  const baseWires = new Map(base.wires.map((w) => [wireKey(base, w), w]));
  const compareWires = new Map(
    compare.wires.map((w) => [wireKey(compare, w), w])
  );

  for (const [key, w] of compareWires) {
    const prev = baseWires.get(key);
    if (!prev) {
      wires.push({
        kind: 'wire',
        change: 'added',
        sheetName,
        wireKey: key,
        points: [...w.points],
      });
      continue;
    }
    if (wireFingerprint(w) !== wireFingerprint(prev)) {
      wires.push({
        kind: 'wire',
        change: 'modified',
        sheetName,
        wireKey: key,
        detail: 'Route or metadata changed',
        points: [...w.points],
        beforePoints: [...prev.points],
      });
    }
  }

  for (const [key, w] of baseWires) {
    if (!compareWires.has(key)) {
      wires.push({
        kind: 'wire',
        change: 'removed',
        sheetName,
        wireKey: key,
        points: [...w.points],
      });
    }
  }

  return { sheetName, sheetAdded, sheetRemoved, components, wires };
}

function indexSheets(
  project: ElectroProject
): Map<string, ProjectSheet> {
  const map = new Map<string, ProjectSheet>();
  for (const sheet of project.sheets) {
    map.set(sheetKey(sheet.name), sheet);
  }
  return map;
}

/** Compare a base project/snapshot against a newer project. */
export function diffProjects(
  base: ElectroProject,
  compare: ElectroProject,
  baseLabel: string,
  compareLabel: string
): ProjectSnapshotDiff {
  const baseSheets = indexSheets(base);
  const compareSheets = indexSheets(compare);
  const names = new Set([...baseSheets.keys(), ...compareSheets.keys()]);
  const sheets: SnapshotSheetDiff[] = [];

  for (const key of [...names].sort()) {
    const b = baseSheets.get(key);
    const c = compareSheets.get(key);
    const sheetName = c?.name ?? b?.name ?? key;
    const sheetAdded = !b && Boolean(c);
    const sheetRemoved = Boolean(b) && !c;
    sheets.push(
      diffSheetCircuits(
        sheetName,
        b?.circuit ?? null,
        c?.circuit ?? null,
        sheetAdded,
        sheetRemoved
      )
    );
  }

  const summary = {
    sheetsAdded: sheets.filter((s) => s.sheetAdded).length,
    sheetsRemoved: sheets.filter((s) => s.sheetRemoved).length,
    componentsAdded: 0,
    componentsRemoved: 0,
    componentsMoved: 0,
    componentsModified: 0,
    wiresAdded: 0,
    wiresRemoved: 0,
    wiresModified: 0,
  };

  for (const sheet of sheets) {
    for (const c of sheet.components) {
      if (c.change === 'added') summary.componentsAdded += 1;
      if (c.change === 'removed') summary.componentsRemoved += 1;
      if (c.change === 'moved') summary.componentsMoved += 1;
      if (c.change === 'modified') summary.componentsModified += 1;
    }
    for (const w of sheet.wires) {
      if (w.change === 'added') summary.wiresAdded += 1;
      if (w.change === 'removed') summary.wiresRemoved += 1;
      if (w.change === 'modified') summary.wiresModified += 1;
    }
  }

  return { baseLabel, compareLabel, sheets, summary };
}

/** Build canvas overlay markers for one sheet. */
export function visualDiffForSheet(
  diff: ProjectSnapshotDiff,
  sheetName: string
): SnapshotSheetVisualDiff | null {
  const sheet = diff.sheets.find(
    (s) => sheetKey(s.sheetName) === sheetKey(sheetName)
  );
  if (!sheet) return null;

  const added: SnapshotSheetVisualDiff['added'] = [];
  const removed: SnapshotSheetVisualDiff['removed'] = [];
  const moved: SnapshotSheetVisualDiff['moved'] = [];
  const modified: SnapshotSheetVisualDiff['modified'] = [];

  for (const c of sheet.components) {
    if (c.change === 'added' && c.after) {
      added.push({ label: c.label, x: c.after.x, y: c.after.y });
    }
    if (c.change === 'removed' && c.before) {
      removed.push({ label: c.label, x: c.before.x, y: c.before.y });
    }
    if (c.change === 'moved' && c.before && c.after) {
      moved.push({
        label: c.label,
        fromX: c.before.x,
        fromY: c.before.y,
        toX: c.after.x,
        toY: c.after.y,
      });
    }
    if (c.change === 'modified' && c.after) {
      modified.push({
        label: c.label,
        x: c.after.x,
        y: c.after.y,
        detail: c.detail ?? 'Modified',
      });
    }
  }

  const wireMarkers: SnapshotSheetVisualDiff['wires'] = [];
  let wiresAdded = 0;
  let wiresRemoved = 0;
  let wiresModified = 0;
  for (const w of sheet.wires) {
    if (w.change === 'added') wiresAdded += 1;
    if (w.change === 'removed') wiresRemoved += 1;
    if (w.change === 'modified') wiresModified += 1;
    if (w.points && w.points.length >= 4) {
      wireMarkers.push({
        change: w.change,
        wireKey: w.wireKey,
        points: w.points,
        beforePoints: w.beforePoints,
      });
    }
  }

  return {
    baseLabel: diff.baseLabel,
    compareLabel: diff.compareLabel,
    sheetName: sheet.sheetName,
    added,
    removed,
    moved,
    modified,
    wiresAdded,
    wiresRemoved,
    wiresModified,
    wires: wireMarkers,
  };
}
