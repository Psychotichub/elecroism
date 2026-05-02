import type { Circuit, CircuitComponent, Wire } from '../types';

/** Avoid `.` / `-` inside name parts so the pattern stays readable: `Q0.L1-Q1.L1`. */
function safeNamePart(s: string): string {
  const t = s.trim();
  if (!t) return '?';
  return t.replace(/\s+/g, ' ').replace(/[-.]/g, '_');
}

function humanizeType(type: CircuitComponent['type']): string {
  return String(type).replace(/_/g, ' ');
}

function componentTitle(c: CircuitComponent | undefined): string {
  if (!c) return '?';
  const lab = c.label?.trim();
  if (lab) return lab;
  return humanizeType(c.type);
}

/**
 * Designator from endpoints: `{fromLabel}.{fromTerminal}-{toLabel}.{toTerminal}`
 * (e.g. `Q0.L1-Q1.L1`). Updates when component or terminal labels change while
 * `wire.wireNumberAuto` is true.
 */
export function deriveEndpointWireNumber(circuit: Circuit, wire: Wire): string {
  const fc = circuit.components.find((c) => c.id === wire.fromComponentId);
  const tc = circuit.components.find((c) => c.id === wire.toComponentId);
  const fp = fc?.connectionPoints.find((p) => p.id === wire.fromPointId);
  const tp = tc?.connectionPoints.find((p) => p.id === wire.toPointId);
  const fromName = safeNamePart(componentTitle(fc));
  const toName = safeNamePart(componentTitle(tc));
  const fromT = safeNamePart(fp?.label ?? '?');
  const toT = safeNamePart(tp?.label ?? '?');
  return `${fromName}.${fromT}-${toName}.${toT}`;
}

/** Recompute `wireNumber` for every wire with `wireNumberAuto === true`. */
export function refreshAutoWireNumbers(circuit: Circuit): Circuit {
  return {
    ...circuit,
    wires: circuit.wires.map((w) => {
      if (w.wireNumberAuto !== true) return w;
      return {
        ...w,
        wireNumber: deriveEndpointWireNumber(circuit, w),
      };
    }),
  };
}
