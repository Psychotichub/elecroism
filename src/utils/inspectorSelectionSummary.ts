import type { Circuit } from '../types';
import { getComponentPanelDescription } from './componentPanelInfo';

/** Compact Properties tab label, e.g. `M1 · Motor`. */
export function getInspectorSelectionSummary(
  circuit: Circuit,
  selectedId: string | null
): string | undefined {
  if (!selectedId) return undefined;

  const comp = circuit.components.find((c) => c.id === selectedId);
  if (comp) {
    const displayName = getComponentPanelDescription(comp.type)?.displayName ?? comp.type;
    const tag = comp.label.trim();
    if (tag) return `${tag} · ${displayName}`;
    return displayName;
  }

  const wire = circuit.wires.find((w) => w.id === selectedId);
  if (wire) {
    const tag = wire.wireLabel?.trim() || wire.wireNumber?.trim();
    return tag || 'Wire';
  }

  return undefined;
}
