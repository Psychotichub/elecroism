import type { Circuit } from '../types';
import {
  dolMotorStarter,
  simpleLightingCircuit,
} from '../examples/exampleCircuits';
import type { CatalogMetadata } from './catalogMetadata';

export type QuizChallenge = {
  id: string;
  title: string;
  category: string;
  difficulty: CatalogMetadata['difficulty'];
  estimatedMinutes: number;
  prerequisites: string[];
  scenario: string;
  question: string;
  /** Designator label of the de-energized load to diagnose. */
  targetLabel: string;
  build: () => Circuit;
  /** Phrases that should count as correct in free-text grading. */
  acceptedKeywords: string[];
  /** Wrong-but-plausible multiple-choice distractors. */
  distractors: string[];
};

function cloneCircuit(build: () => Circuit): Circuit {
  const c = build();
  return structuredClone(c);
}

function setStateByLabel(
  circuit: Circuit,
  label: string,
  state: Circuit['components'][0]['state']
): void {
  const comp = circuit.components.find((c) => c.label === label);
  if (comp) comp.state = state;
}

function removeContactorCoilWires(circuit: Circuit): void {
  const km = circuit.components.find((c) => c.label === 'KM1');
  if (!km) return;
  const coilIds = new Set(
    km.connectionPoints
      .filter((p) => p.label === 'A1' || p.label === 'A2')
      .map((p) => p.id)
  );
  circuit.wires = circuit.wires.filter((w) => {
    const touchesCoil =
      (w.fromComponentId === km.id && coilIds.has(w.fromPointId)) ||
      (w.toComponentId === km.id && coilIds.has(w.toPointId));
    return !touchesCoil;
  });
}

export const QUIZ_CHALLENGES: QuizChallenge[] = [
  {
    id: 'dol-mcb-off',
    title: 'DOL: MCB left OFF',
    category: 'Motor Control',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    prerequisites: [],
    scenario:
      'A single-phase DOL starter is wired correctly, but motor M1 stays off after energizing the supply.',
    question: 'Why is motor M1 de-energized?',
    targetLabel: 'M1',
    build: () => {
      const circuit = cloneCircuit(dolMotorStarter);
      setStateByLabel(circuit, 'Q1', 'off');
      return circuit;
    },
    acceptedKeywords: [
      'q1 is off',
      'mcb is off',
      'circuit breaker',
      'q1 (mcb)',
      'no supply',
    ],
    distractors: [
      'Motor M1 winding has failed open-circuit.',
      'Overload relay F1 has tripped on sustained overcurrent.',
      'Contactor KM1 coil is energized but welded contacts.',
    ],
  },
  {
    id: 'dol-coil-unwired',
    title: 'DOL: Contactor coil open',
    category: 'Motor Control',
    difficulty: 'intermediate',
    estimatedMinutes: 8,
    prerequisites: ['DOL: MCB left OFF'],
    scenario:
      'The DOL power path is complete, but M1 never starts even though Q1 is ON.',
    question: 'Why is motor M1 de-energized?',
    targetLabel: 'M1',
    build: () => {
      const circuit = cloneCircuit(dolMotorStarter);
      setStateByLabel(circuit, 'Q1', 'on');
      removeContactorCoilWires(circuit);
      return circuit;
    },
    acceptedKeywords: [
      'coil not energized',
      'km1 coil',
      'contacts open',
      'a1',
      'a2',
      'unwired',
    ],
    distractors: [
      'MCB Q1 has tripped on magnetic fault.',
      'Overload F1 heater element is open.',
      'Supply neutral is disconnected at the source.',
    ],
  },
  {
    id: 'lighting-switch-off',
    title: 'Lighting: switch open',
    category: 'Power',
    difficulty: 'beginner',
    estimatedMinutes: 5,
    prerequisites: [],
    scenario:
      'Two parallel lamps are fed from Q1. L1 is dark while the supply is present.',
    question: 'Why is lamp L1 de-energized?',
    targetLabel: 'L1',
    build: () => {
      const circuit = cloneCircuit(simpleLightingCircuit);
      setStateByLabel(circuit, 'S1', 'off');
      return circuit;
    },
    acceptedKeywords: [
      's1 is off',
      's1 (switch)',
      'switched off',
      'switch is off',
    ],
    distractors: [
      'MCB Q1 has tripped on overload.',
      'Lamp L1 filament has failed.',
      'Neutral conductor is broken at the junction.',
    ],
  },
  {
    id: 'lighting-mcb-tripped',
    title: 'Lighting: MCB tripped',
    category: 'Power',
    difficulty: 'beginner',
    estimatedMinutes: 6,
    prerequisites: [],
    scenario:
      'The lighting circuit was running yesterday. Today both lamps are off.',
    question: 'Why is lamp L1 de-energized?',
    targetLabel: 'L1',
    build: () => {
      const circuit = cloneCircuit(simpleLightingCircuit);
      setStateByLabel(circuit, 'Q1', 'tripped');
      return circuit;
    },
    acceptedKeywords: [
      'q1 has tripped',
      'q1 is tripped',
      'tripped',
      'mcb',
      'circuit open upstream',
    ],
    distractors: [
      'Wall switch S1 was left in the OFF position.',
      'L2 short-circuit is holding the junction live.',
      'Supply voltage is below undervoltage threshold.',
    ],
  },
  {
    id: 'lighting-neutral-fault',
    title: 'Lighting: neutral open',
    category: 'Power',
    difficulty: 'intermediate',
    estimatedMinutes: 10,
    prerequisites: ['Lighting: switch open'],
    scenario:
      'S1 is ON and Q1 is healthy, but both lamps L1 and L2 are dark while the live side appears wired.',
    question: 'Why is lamp L1 de-energized?',
    targetLabel: 'L1',
    build: () => {
      const circuit = cloneCircuit(simpleLightingCircuit);
      setStateByLabel(circuit, 'S1', 'on');
      setStateByLabel(circuit, 'Q1', 'on');
      const jMerge = circuit.components.find(
        (c) => c.type === 'junction' && c.x === 200 && c.y === 520
      );
      const jNR = circuit.components.find(
        (c) => c.type === 'junction' && c.x === 340 && c.y === 520
      );
      if (jMerge && jNR) {
        circuit.wires = circuit.wires.filter(
          (w) =>
            !(
              (w.fromComponentId === jMerge.id &&
                w.toComponentId === jNR.id) ||
              (w.fromComponentId === jNR.id && w.toComponentId === jMerge.id)
            )
        );
      }
      return circuit;
    },
    acceptedKeywords: [
      'neutral',
      'return path',
      'open neutral',
      'broken neutral',
      'n conductor',
      'no return',
      'jnr',
    ],
    distractors: [
      'Wall switch S1 is stuck open.',
      'MCB Q1 has tripped on overload.',
      'L1 filament failed open-circuit.',
    ],
  },
];

export function getQuizChallenge(id: string): QuizChallenge | undefined {
  return QUIZ_CHALLENGES.find((c) => c.id === id);
}

export function listQuizChallenges(): QuizChallenge[] {
  return QUIZ_CHALLENGES;
}
