import type { TutorialCheckpointContext } from './tutorialCheckpoints';
import {
  contactorCoilWired,
  dolNeutralAndCoilWired,
  dolPowerPathWired,
  hasComponentType,
  motorEnergized,
  motorFullyWired,
} from './tutorialCheckpoints';

export type GuidedTutorialStep = {
  id: string;
  title: string;
  instruction: string;
  hint: string;
  validate: (ctx: TutorialCheckpointContext) => boolean;
};

export type GuidedTutorial = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** Clear the sheet when the lesson starts. */
  clearOnStart: boolean;
  steps: GuidedTutorialStep[];
};

const DOL_STEPS: GuidedTutorialStep[] = [
  {
    id: 'intro',
    title: 'Goal',
    instruction:
      'Build a single-phase Direct-On-Line (DOL) motor starter: supply → MCB → contactor → overload → motor, with a contactor coil fed from live and returned to neutral.',
    hint: 'Use the component palette on the left (drag or keyboard ↑↓ + Enter). Wire tool is W in the toolbar.',
    validate: () => true,
  },
  {
    id: 'source',
    title: 'AC supply',
    instruction: 'Place an AC supply symbol at the top of your diagram.',
    hint: 'Palette → Sources → AC Supply (or search “source”).',
    validate: ({ circuit }) => hasComponentType(circuit, 'power_source'),
  },
  {
    id: 'mcb',
    title: 'Circuit breaker',
    instruction: 'Add an MCB downstream of the supply for short-circuit and overload protection.',
    hint: 'Label it Q1 if you like — wire schedules use designators.',
    validate: ({ circuit }) => hasComponentType(circuit, 'mcb'),
  },
  {
    id: 'contactor',
    title: 'Contactor',
    instruction: 'Add a contactor (KM1) to switch power to the motor.',
    hint: 'The main poles are T1/T2; the coil terminals are A1 and A2 on the sides.',
    validate: ({ circuit }) => hasComponentType(circuit, 'contactor'),
  },
  {
    id: 'olr',
    title: 'Overload relay',
    instruction: 'Add an overload relay (thermal) between the contactor and motor.',
    hint: 'It protects the motor from sustained overcurrent.',
    validate: ({ circuit }) => hasComponentType(circuit, 'overload_relay'),
  },
  {
    id: 'motor',
    title: 'Motor',
    instruction: 'Add the motor load at the bottom of the power path.',
    hint: 'Set rated power in Properties after placing if you want realistic current.',
    validate: ({ circuit }) => hasComponentType(circuit, 'motor'),
  },
  {
    id: 'power-wires',
    title: 'Wire the power path',
    instruction:
      'Wire live from supply → MCB → contactor poles → overload → motor T1. Connect motor T2 back toward neutral (junctions are fine).',
    hint: 'Select Wire (W), click terminals in order. You need at least four series links on the live side.',
    validate: ({ circuit }) => dolPowerPathWired(circuit),
  },
  {
    id: 'coil-neutral',
    title: 'Coil & neutral',
    instruction:
      'Feed contactor A1 from the live side (after the MCB). Return A2 to neutral. Tie supply N_OUT into the same neutral network as the motor return.',
    hint: 'When the coil is energized, KM1 pulls in and the motor should run in simulation.',
    validate: ({ circuit }) => dolNeutralAndCoilWired(circuit),
  },
  {
    id: 'simulate',
    title: 'Simulate',
    instruction:
      'Click Simulate in the toolbar. The motor should energize with the contactor coil picked up.',
    hint: 'If the motor stays off, check coil wiring and that the MCB/contactor are ON.',
    validate: ({ circuit, simulationResult }) =>
      motorEnergized(circuit, simulationResult),
  },
  {
    id: 'complete',
    title: 'Starter complete',
    instruction:
      'You built a working DOL starter. Try adding a stop button in series with the coil, or load the built-in DOL template from Starters to compare.',
    hint: 'Explore Validation with Learning mode enabled for plain-language design tips.',
    validate: ({ circuit, simulationResult }) =>
      motorEnergized(circuit, simulationResult) &&
      motorFullyWired(circuit) &&
      contactorCoilWired(circuit),
  },
];

export const GUIDED_TUTORIALS: GuidedTutorial[] = [
  {
    id: 'dol-starter-1p',
    title: 'Build a DOL Starter',
    description:
      'Step-by-step: single-phase supply, protection, contactor, overload, and motor with coil/neutral wiring.',
    category: 'Motor Control',
    clearOnStart: true,
    steps: DOL_STEPS,
  },
];

export function getGuidedTutorial(id: string): GuidedTutorial | undefined {
  return GUIDED_TUTORIALS.find((t) => t.id === id);
}

export function listGuidedTutorials(): GuidedTutorial[] {
  return GUIDED_TUTORIALS;
}

export function evaluateTutorialStep(
  tutorial: GuidedTutorial,
  stepIndex: number,
  ctx: TutorialCheckpointContext
): boolean {
  const step = tutorial.steps[stepIndex];
  if (!step) return false;
  return step.validate(ctx);
}
