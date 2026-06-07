import { v4 as uuid } from 'uuid';
import type { Circuit, CircuitComponent, Wire } from '../types';
import { createEmptyCircuit } from '../store/circuitDefaults';
import {
  createConnectionPoints,
} from '../store/circuitConnectionGeometry';
import {
  getDefaultLabel,
  getDefaultProperties,
} from '../store/circuitDefaults';

/**
 * Synthetic sheet for canvas performance benchmarks (grid of MCBs + horizontal wires).
 */
export function buildCanvasStressCircuit(componentCount: number): Circuit {
  const circuit = createEmptyCircuit();
  circuit.name = `Stress ${componentCount}`;
  const cols = Math.max(1, Math.ceil(Math.sqrt(componentCount)));
  const spacing = 72;

  const components: CircuitComponent[] = [];
  for (let i = 0; i < componentCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const id = uuid();
    components.push({
      id,
      type: 'mcb',
      label: getDefaultLabel('mcb').replace(/\d+/, String(i + 1)),
      x: col * spacing + 40,
      y: row * spacing + 40,
      rotation: 0,
      state: 'on',
      selected: false,
      connectionPoints: createConnectionPoints(id, 'mcb', {}),
      properties: { ...getDefaultProperties('mcb'), ratingAmps: 16 },
    });
  }

  const wires: Wire[] = [];
  for (let i = 0; i < components.length - 1; i++) {
    const row = Math.floor(i / cols);
    const nextRow = Math.floor((i + 1) / cols);
    if (row !== nextRow) continue;
    const a = components[i];
    const b = components[i + 1];
    const aOut = a.connectionPoints.find((p) => p.label === '2');
    const bIn = b.connectionPoints.find((p) => p.label === '1');
    if (!aOut || !bIn) continue;
    wires.push({
      id: uuid(),
      fromComponentId: a.id,
      fromPointId: aOut.id,
      toComponentId: b.id,
      toPointId: bIn.id,
      points: [
        a.x + aOut.x,
        a.y + aOut.y,
        b.x + bIn.x,
        b.y + bIn.y,
      ],
      color: 'brown',
      crossSection: 2.5,
      energized: false,
      currentAmps: 0,
    });
  }

  circuit.components = components;
  circuit.wires = wires;
  return circuit;
}
