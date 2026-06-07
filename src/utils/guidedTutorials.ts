import type { Circuit } from '../types';
import {
  atsTransfer,
  dolMotorStarter,
  starDeltaStarter,
} from '../examples/exampleCircuits';
import type { CatalogMetadata } from './catalogMetadata';
import type { TutorialCheckpointContext } from './tutorialCheckpoints';
import {
  contactorCoilWired,
  dolNeutralAndCoilWired,
  dolPowerPathWired,
  hasAtsTransferPanel,
  hasComponentType,
  hasStarDeltaStarterKit,
  motorEnergized,
  motorFeederSized,
  motorFullyWired,
  threePhaseMotorEnergized,
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
  difficulty: CatalogMetadata['difficulty'];
  estimatedMinutes: number;
  prerequisites: string[];
  /** Clear the sheet when the lesson starts. */
  clearOnStart: boolean;
  /** Optional reference circuit to load instead of a blank sheet. */
  initialCircuit?: () => Circuit;
  steps: GuidedTutorialStep[];
};

function cableSizingExerciseCircuit(): Circuit {
  const circuit = dolMotorStarter();
  const motorId = circuit.components.find((c) => c.type === 'motor')?.id;
  for (const w of circuit.wires) {
    if (
      motorId &&
      (w.fromComponentId === motorId || w.toComponentId === motorId)
    ) {
      w.crossSection = 1.5;
    }
  }
  return circuit;
}

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

const STAR_DELTA_STEPS: GuidedTutorialStep[] = [
  {
    id: 'intro',
    title: 'Star-delta purpose',
    instruction:
      'A Y-Δ starter reduces inrush: KM1 feeds the line, KM2 connects windings in star for start, then the timer switches to KM3 for delta run.',
    hint: 'This lesson loads the reference Y-Δ circuit — trace KM1, KM2, KM3, and timer KT1.',
    validate: () => true,
  },
  {
    id: 'kit',
    title: 'Starter kit',
    instruction:
      'Confirm the sheet has a 3φ supply, Q1, three contactors (KM1 line, KM2 star, KM3 delta), a motor, and a timer.',
    hint: 'Compare with Insert → Examples → Star-Delta Motor Starter if you need the full wiring.',
    validate: ({ circuit }) => hasStarDeltaStarterKit(circuit),
  },
  {
    id: 'start',
    title: 'Energize start',
    instruction:
      'Momentarily press push-button SB1 (or hold it ON) so KM1 picks up and the timer sequence can begin.',
    hint: 'Right-click SB1 or use Properties to latch the button ON for practice.',
    validate: ({ circuit }) =>
      circuit.components.some(
        (c) => c.label === 'SB1' && c.state === 'on'
      ),
  },
  {
    id: 'simulate',
    title: 'Run simulation',
    instruction:
      'Run simulation. Motor M1 should energize after the star connection engages.',
    hint: 'Open the oscilloscope timeline later to watch KM2 release and KM3 close.',
    validate: ({ circuit, simulationResult }) =>
      threePhaseMotorEnergized(circuit, simulationResult),
  },
  {
    id: 'complete',
    title: 'Sequence understood',
    instruction:
      'You traced a Y-Δ starter. Next, adjust KT1 delay and note how long the motor stays in star before delta.',
    hint: 'Validation → Protection coordination helps compare upstream devices on motor feeders.',
    validate: ({ circuit, simulationResult }) =>
      hasStarDeltaStarterKit(circuit) &&
      threePhaseMotorEnergized(circuit, simulationResult),
  },
];

const ATS_STEPS: GuidedTutorialStep[] = [
  {
    id: 'intro',
    title: 'ATS overview',
    instruction:
      'An automatic transfer switch feeds a load from utility mains, then starts a generator and transfers on utility failure.',
    hint: 'This panel uses selector S1 in AUTO with KM-M (mains) and KM-G (generator).',
    validate: () => true,
  },
  {
    id: 'panel',
    title: 'Panel layout',
    instruction:
      'Identify Mains and Generator sources, KM-M / KM-G contactors, busbars, load M1, and the AUTO selector with ATS settings.',
    hint: 'Open Properties on S1 to review fail/restore times and open-transition gap.',
    validate: ({ circuit }) => hasAtsTransferPanel(circuit),
  },
  {
    id: 'indication',
    title: 'Indication',
    instruction:
      'Note indicator lamps H-M and H-G — they show which source is presently available to the control circuit.',
    hint: 'Lamps follow the same phase presence as their respective sources.',
    validate: ({ circuit }) =>
      circuit.components.some((c) => c.label === 'H-M') &&
      circuit.components.some((c) => c.label === 'H-G'),
  },
  {
    id: 'simulate',
    title: 'Normal utility feed',
    instruction:
      'Simulate with mains present. KM-M should be closed and motor M1 - Load should run from utility.',
    hint: 'Use Simulate → timeline (if available) or run steady-state first.',
    validate: ({ circuit, simulationResult }) =>
      threePhaseMotorEnergized(circuit, simulationResult),
  },
  {
    id: 'sequence',
    title: 'Transfer timing',
    instruction:
      'Review S1 ATS properties: utility fail at 2 s, generator crank delay, open break, then gen feed. Restore timing governs retransfer.',
    hint: 'atsUtilityFailAtMs and atsUtilityRestoreAtMs define the exercise sequence.',
    validate: ({ circuit }) => {
      const s1 = circuit.components.find((c) => c.label === 'S1');
      return (
        (s1?.properties.atsUtilityFailAtMs ?? 0) > 0 &&
        (s1?.properties.atsGenStartDelayMs ?? 0) >= 0
      );
    },
  },
  {
    id: 'complete',
    title: 'ATS lesson complete',
    instruction:
      'You mapped a dual-source ATS. Try shortening fail delay and watch KM-G pick up in simulation logs.',
    hint: 'Mechanical interlock IL1 prevents both contactors closing against the configured rules.',
    validate: ({ circuit, simulationResult }) =>
      hasAtsTransferPanel(circuit) &&
      threePhaseMotorEnergized(circuit, simulationResult),
  },
];

const CABLE_SIZING_STEPS: GuidedTutorialStep[] = [
  {
    id: 'intro',
    title: 'Cable sizing goal',
    instruction:
      'Undersized conductors overheat and drop voltage. Size the motor feeder to match load current and installation method.',
    hint: 'This exercise loads a DOL starter with 1.5 mm² feeders — too small for motor M1.',
    validate: () => true,
  },
  {
    id: 'baseline',
    title: 'Spot the risk',
    instruction:
      'Run simulation and open Validation — note wire thermal or voltage-drop warnings on the motor feeder.',
    hint: 'Learning mode in Validation explains ampacity and Zs concepts in plain language.',
    validate: ({ circuit, simulationResult }) =>
      !!simulationResult && motorEnergized(circuit, simulationResult),
  },
  {
    id: 'wizard',
    title: 'Use the cable wizard',
    instruction:
      'Select the live wire to motor M1, open the Cable Sizing wizard in the inspector, enter load and length, and apply the recommended mm².',
    hint: 'Inspector → wire properties → Cable sizing wizard, or Validation tab cable schedule.',
    validate: ({ circuit }) => motorFeederSized(circuit, 2.5),
  },
  {
    id: 'verify',
    title: 'Verify',
    instruction:
      'Re-run simulation. Thermal warnings on the motor feeder should clear or improve with ≥ 2.5 mm² Cu.',
    hint: 'Export cable schedule CSV to see applied mm² and derating factors.',
    validate: ({ circuit, simulationResult }) =>
      motorFeederSized(circuit, 2.5) &&
      motorEnergized(circuit, simulationResult),
  },
  {
    id: 'complete',
    title: 'Sizing exercise done',
    instruction:
      'You sized a feeder for a real load. Try grouping circuits and derating factors in the wizard for tray installs.',
    hint: 'Compare with IEC 60364-5-52 tables referenced in the wizard help text.',
    validate: ({ circuit }) => motorFeederSized(circuit, 2.5),
  },
];

export const GUIDED_TUTORIALS: GuidedTutorial[] = [
  {
    id: 'dol-starter-1p',
    title: 'Build a DOL Starter',
    description:
      'Step-by-step: single-phase supply, protection, contactor, overload, and motor with coil/neutral wiring.',
    category: 'Motor Control',
    difficulty: 'beginner',
    estimatedMinutes: 25,
    prerequisites: [],
    clearOnStart: true,
    steps: DOL_STEPS,
  },
  {
    id: 'star-delta-3p',
    title: 'Star-Delta Starter',
    description:
      'Walk through KM1/KM2/KM3 roles, timer changeover, and reduced-voltage starting on a 3φ motor.',
    category: 'Motor Control',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    prerequisites: ['Build a DOL Starter'],
    clearOnStart: false,
    initialCircuit: starDeltaStarter,
    steps: STAR_DELTA_STEPS,
  },
  {
    id: 'ats-transfer-sequence',
    title: 'ATS Transfer Sequence',
    description:
      'Dual-source automatic transfer: utility fail, generator crank, open transition, and retransfer timing.',
    category: 'Power',
    difficulty: 'advanced',
    estimatedMinutes: 18,
    prerequisites: ['3-Phase motor basics'],
    clearOnStart: false,
    initialCircuit: atsTransfer,
    steps: ATS_STEPS,
  },
  {
    id: 'cable-sizing-exercise',
    title: 'Cable Sizing Exercise',
    description:
      'Find an undersized motor feeder, run the cable wizard, and apply a compliant copper cross-section.',
    category: 'Design',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    prerequisites: ['Build a DOL Starter'],
    clearOnStart: false,
    initialCircuit: cableSizingExerciseCircuit,
    steps: CABLE_SIZING_STEPS,
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
