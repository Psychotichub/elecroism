import type { Circuit, Wire } from '../types';
import type {
  CircuitValidationIssue,
  CircuitValidationSeverity,
} from './circuitDesignValidation';
import {
  boundsForComponents,
  boundsForWire,
  mergeBounds,
  type WorldBounds,
} from './drawingBounds';
import { viewportForBounds } from './crossSheetNavigation';

export type ValidationCanvasMarker = {
  issueId: string;
  severity: CircuitValidationSeverity;
  x: number;
  y: number;
};

const SEVERITY_RANK: Record<CircuitValidationSeverity, number> = {
  error: 3,
  warning: 2,
  info: 1,
};

export function wireMidpoint(wire: Wire): { x: number; y: number } {
  const pts = wire.points;
  if (pts.length < 2) return { x: 0, y: 0 };
  if (pts.length === 4) {
    const x0 = pts[0] ?? 0;
    const y0 = pts[1] ?? 0;
    const x2 = pts[2] ?? 0;
    const y2 = pts[3] ?? 0;
    return { x: (x0 + x2) / 2, y: (y0 + y2) / 2 };
  }
  const mid = Math.floor((pts.length / 2 - 1) / 2) * 2;
  return { x: pts[mid] ?? 0, y: pts[mid + 1] ?? 0 };
}

function boundsForIssue(
  circuit: Circuit,
  issue: CircuitValidationIssue
): WorldBounds | null {
  let bounds: WorldBounds | null = null;

  if (issue.componentIds.length > 0) {
    bounds = boundsForComponents(circuit, issue.componentIds);
  }

  for (const wireId of issue.wireIds ?? []) {
    const wire = circuit.wires.find((w) => w.id === wireId);
    if (!wire) continue;
    const wb = boundsForWire(wire);
    if (!wb) continue;
    bounds = bounds ? mergeBounds(bounds, wb) : wb;
  }

  return bounds;
}

/** Pan/zoom viewport that frames the components and wires for a validation issue. */
export function viewportForValidationIssue(
  circuit: Circuit,
  issue: CircuitValidationIssue
): { zoom: number; panX: number; panY: number } | null {
  const bounds = boundsForIssue(circuit, issue);
  if (!bounds) return null;
  return viewportForBounds(bounds);
}

/** Primary canvas marker per validation issue (component centre or wire midpoint). */
export function validationMarkersForIssues(
  circuit: Circuit,
  issues: CircuitValidationIssue[]
): ValidationCanvasMarker[] {
  const markers: ValidationCanvasMarker[] = [];

  for (const issue of issues) {
    if ((issue.wireIds?.length ?? 0) > 0) {
      const wire = circuit.wires.find((w) => w.id === issue.wireIds![0]);
      if (wire) {
        const mid = wireMidpoint(wire);
        markers.push({
          issueId: issue.id,
          severity: issue.severity,
          x: mid.x,
          y: mid.y,
        });
        continue;
      }
    }

    const comp = circuit.components.find((c) => c.id === issue.componentIds[0]);
    if (comp) {
      markers.push({
        issueId: issue.id,
        severity: issue.severity,
        x: comp.x,
        y: comp.y,
      });
    }
  }

  return markers;
}

export function severityStroke(severity: CircuitValidationSeverity): string {
  switch (severity) {
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    default:
      return '#38bdf8';
  }
}

export function worstSeverity(
  a: CircuitValidationSeverity,
  b: CircuitValidationSeverity
): CircuitValidationSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}
