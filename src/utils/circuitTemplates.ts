import type { Circuit, CircuitComponent, Wire } from '../types';
import {
  dolMotorStarter,
  threePhaseMotorStarter,
  starDeltaStarter,
  vfdFeeder,
  atsTransfer,
} from '../examples/exampleCircuits';

export interface CircuitTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Motor Control' | 'Power';
  build: () => { components: CircuitComponent[]; wires: Wire[] };
}

function fromCircuit(build: () => Circuit): () => {
  components: CircuitComponent[];
  wires: Wire[];
} {
  return () => {
    const circuit = build();
    return {
      components: structuredClone(circuit.components),
      wires: structuredClone(circuit.wires),
    };
  };
}

export const CIRCUIT_TEMPLATES: CircuitTemplate[] = [
  {
    id: 'dol-1p',
    name: 'DOL Starter (1φ)',
    description: 'MCB → contactor → overload → motor with neutral return.',
    category: 'Motor Control',
    build: fromCircuit(dolMotorStarter),
  },
  {
    id: 'dol-3p',
    name: 'DOL Starter (3φ)',
    description: '3P MCB → 3P contactor → three-phase motor.',
    category: 'Motor Control',
    build: fromCircuit(threePhaseMotorStarter),
  },
  {
    id: 'star-delta',
    name: 'Star-Delta (Y-Δ)',
    description: 'Line, star, and delta contactors with timer changeover.',
    category: 'Motor Control',
    build: fromCircuit(starDeltaStarter),
  },
  {
    id: 'vfd-feeder',
    name: 'VFD Feeder',
    description: 'Isolator contactor feeding a VFD-driven motor (elevated THD).',
    category: 'Motor Control',
    build: fromCircuit(vfdFeeder),
  },
  {
    id: 'ats',
    name: 'ATS Transfer',
    description: 'Mains + generator sources, busbars, load, selector & lamps.',
    category: 'Power',
    build: fromCircuit(atsTransfer),
  },
];

export function getCircuitTemplate(id: string): CircuitTemplate | undefined {
  return CIRCUIT_TEMPLATES.find((t) => t.id === id);
}

export function listCircuitTemplates(): CircuitTemplate[] {
  return CIRCUIT_TEMPLATES;
}
