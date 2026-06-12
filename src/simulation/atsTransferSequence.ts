import type { Circuit, CircuitComponent } from '../types';
import { CircuitEngine } from './engine';
import type { SimulateOverrides } from './simulateOverrides';
import type { TimelineOptions, TimelineSample } from './transientTimeline';
import { computeMotorThermalTimeline } from './motorThermal';
import type { CircuitValidationIssue } from '../utils/circuitDesignValidation';

export type AtsTransitionMode = 'open' | 'closed';

export type AtsPhaseKind =
  | 'normal_utility'
  | 'utility_lost'
  | 'gen_cranking'
  | 'open_break'
  | 'closed_overlap'
  | 'gen_feed'
  | 'utility_return'
  | 'retransfer_break'
  | 'utility_restored';

export type AtsPhaseState = {
  kind: AtsPhaseKind;
  label: string;
  utilitySourceOn: boolean;
  genSourceOn: boolean;
  utilityKmClosed: boolean;
  genKmClosed: boolean;
};

export type ResolvedAtsConfig = {
  controllerId: string;
  controllerLabel: string;
  utilitySourceId: string;
  genSourceId: string;
  utilityContactorId: string;
  genContactorId: string;
  transition: AtsTransitionMode;
  interlockRequired: boolean;
  utilityFailAtMs: number;
  genStartDelayMs: number;
  transferDelayMs: number;
  openTransitionGapMs: number;
  closedOverlapMs: number;
  utilityRestoreAtMs: number | null;
  retransferDelayMs: number;
  durationMs: number;
};

const SOURCE_TYPES = new Set<CircuitComponent['type']>([
  'power_source',
  'three_phase_source',
]);

const CONTACTOR_TYPES = new Set<CircuitComponent['type']>([
  'contactor',
  'three_phase_contactor',
  'four_phase_contactor',
]);

function labelNorm(l: string): string {
  return l.trim().toUpperCase();
}

function findByLabel(
  circuit: Circuit,
  label: string | undefined,
  pred: (c: CircuitComponent) => boolean
): CircuitComponent | null {
  if (!label?.trim()) return null;
  const want = labelNorm(label);
  return (
    circuit.components.find(
      (c) => pred(c) && labelNorm(c.label) === want
    ) ?? null
  );
}

function findByLabelPattern(
  circuit: Circuit,
  patterns: RegExp[],
  pred: (c: CircuitComponent) => boolean
): CircuitComponent | null {
  for (const c of circuit.components) {
    if (!pred(c)) continue;
    const L = c.label.trim();
    if (patterns.some((re) => re.test(L))) return c;
  }
  return null;
}

export function resolveAtsConfig(circuit: Circuit): ResolvedAtsConfig | null {
  const controller =
    circuit.components.find(
      (c) => c.type === 'selector_switch' && c.properties.atsController
    ) ??
    circuit.components.find(
      (c) =>
        c.type === 'selector_switch' &&
        (c.properties.selectorPosition === 'AUTO' ||
          /ATS|S1/i.test(c.label))
    );
  if (!controller) return null;

  const p = controller.properties;
  const utilitySource =
    findByLabel(circuit, p.atsUtilitySourceLabel, (c) =>
      SOURCE_TYPES.has(c.type)
    ) ??
    findByLabelPattern(
      circuit,
      [/mains/i, /utility/i, /grid/i, /incomer/i],
      (c) => SOURCE_TYPES.has(c.type)
    );
  const genSource =
    findByLabel(circuit, p.atsGenSourceLabel, (c) =>
      SOURCE_TYPES.has(c.type)
    ) ??
    findByLabelPattern(
      circuit,
      [/generator/i, /gen/i, /g-set/i],
      (c) => SOURCE_TYPES.has(c.type) && c.id !== utilitySource?.id
    );

  const utilityKm =
    findByLabel(circuit, p.atsUtilityContactorLabel, (c) =>
      CONTACTOR_TYPES.has(c.type)
    ) ??
    findByLabelPattern(
      circuit,
      [/km-m/i, /km_main/i, /utility/i, /mains/i],
      (c) => CONTACTOR_TYPES.has(c.type)
    );
  const genKm =
    findByLabel(circuit, p.atsGenContactorLabel, (c) =>
      CONTACTOR_TYPES.has(c.type)
    ) ??
    findByLabelPattern(
      circuit,
      [/km-g/i, /km_gen/i, /generator/i],
      (c) => CONTACTOR_TYPES.has(c.type) && c.id !== utilityKm?.id
    );

  if (!utilitySource || !genSource || !utilityKm || !genKm) return null;

  const utilityFailAtMs = Math.max(0, p.atsUtilityFailAtMs ?? 2000);
  const genStartDelayMs = Math.max(0, p.atsGenStartDelayMs ?? 1500);
  const transferDelayMs = Math.max(0, p.atsTransferDelayMs ?? 1000);
  const restoreRaw = p.atsUtilityRestoreAtMs;
  const utilityRestoreAtMs =
    restoreRaw != null && restoreRaw > 0 ? restoreRaw : null;

  return {
    controllerId: controller.id,
    controllerLabel: controller.label,
    utilitySourceId: utilitySource.id,
    genSourceId: genSource.id,
    utilityContactorId: utilityKm.id,
    genContactorId: genKm.id,
    transition: p.atsTransition ?? 'open',
    interlockRequired: p.atsInterlockRequired !== false,
    utilityFailAtMs,
    genStartDelayMs,
    transferDelayMs,
    openTransitionGapMs: Math.max(0, p.atsOpenTransitionGapMs ?? 300),
    closedOverlapMs: Math.max(0, p.atsClosedOverlapMs ?? 200),
    utilityRestoreAtMs,
    retransferDelayMs: Math.max(0, p.atsRetransferDelayMs ?? 2000),
    durationMs: Math.max(
      utilityFailAtMs + genStartDelayMs + transferDelayMs + 4000,
      utilityRestoreAtMs != null
        ? utilityRestoreAtMs + Math.max(0, p.atsRetransferDelayMs ?? 2000) + 3000
        : 0,
      12000
    ),
  };
}

export function getAtsPhaseAtTime(
  config: ResolvedAtsConfig,
  timeMs: number
): AtsPhaseState {
  const fail = config.utilityFailAtMs;
  const genOn = fail + config.genStartDelayMs;
  const xfer = genOn + config.transferDelayMs;
  const restore = config.utilityRestoreAtMs;

  if (timeMs < fail) {
    return {
      kind: 'normal_utility',
      label: 'Normal — utility feed',
      utilitySourceOn: true,
      genSourceOn: false,
      utilityKmClosed: true,
      genKmClosed: false,
    };
  }

  if (restore != null && timeMs >= restore + config.retransferDelayMs) {
    return {
      kind: 'utility_restored',
      label: 'Restored — utility feed',
      utilitySourceOn: true,
      genSourceOn: false,
      utilityKmClosed: true,
      genKmClosed: false,
    };
  }

  if (restore != null && timeMs >= restore + config.openTransitionGapMs) {
    return {
      kind: 'retransfer_break',
      label: 'Retransfer — open gen, close utility',
      utilitySourceOn: true,
      genSourceOn: true,
      utilityKmClosed: false,
      genKmClosed: false,
    };
  }

  if (restore != null && timeMs >= restore) {
    return {
      kind: 'utility_return',
      label: 'Utility restored — gen still feeding',
      utilitySourceOn: true,
      genSourceOn: true,
      utilityKmClosed: false,
      genKmClosed: true,
    };
  }

  if (config.transition === 'closed') {
    const overlapEnd = xfer + config.closedOverlapMs;
    if (timeMs < xfer) {
      return {
        kind: 'gen_cranking',
        label: 'Utility lost — generator starting',
        utilitySourceOn: false,
        genSourceOn: true,
        utilityKmClosed: true,
        genKmClosed: false,
      };
    }
    if (timeMs < overlapEnd) {
      return {
        kind: 'closed_overlap',
        label: 'Closed transition — brief parallel feed',
        utilitySourceOn: false,
        genSourceOn: true,
        utilityKmClosed: true,
        genKmClosed: true,
      };
    }
    return {
      kind: 'gen_feed',
      label: 'Generator feed',
      utilitySourceOn: false,
      genSourceOn: true,
      utilityKmClosed: false,
      genKmClosed: true,
    };
  }

  const breakEnd = xfer + config.openTransitionGapMs;
  if (timeMs < genOn) {
    return {
      kind: 'utility_lost',
      label: 'Utility lost — load dead',
      utilitySourceOn: false,
      genSourceOn: false,
      utilityKmClosed: true,
      genKmClosed: false,
    };
  }
  if (timeMs < xfer) {
    return {
      kind: 'gen_cranking',
      label: 'Generator cranking — not transferred',
      utilitySourceOn: false,
      genSourceOn: true,
      utilityKmClosed: true,
      genKmClosed: false,
    };
  }
  if (timeMs < breakEnd) {
    return {
      kind: 'open_break',
      label: 'Open transition — break before make',
      utilitySourceOn: false,
      genSourceOn: true,
      utilityKmClosed: false,
      genKmClosed: false,
    };
  }
  return {
    kind: 'gen_feed',
    label: 'Generator feed',
    utilitySourceOn: false,
    genSourceOn: true,
    utilityKmClosed: false,
    genKmClosed: true,
  };
}

export function applyAtsPhaseToCircuit(
  circuit: Circuit,
  config: ResolvedAtsConfig,
  phase: AtsPhaseState
): SimulateOverrides {
  const controller = circuit.components.find((c) => c.id === config.controllerId);
  if (controller) {
    controller.properties.selectorPosition = 'AUTO';
    controller.state = 'on';
  }

  const utilitySource = circuit.components.find(
    (c) => c.id === config.utilitySourceId
  );
  const genSource = circuit.components.find((c) => c.id === config.genSourceId);
  if (utilitySource) {
    utilitySource.state = phase.utilitySourceOn ? 'on' : 'off';
  }
  if (genSource) {
    genSource.state = phase.genSourceOn ? 'on' : 'off';
  }

  const forced = new Map<string, boolean>();
  forced.set(config.utilityContactorId, phase.utilityKmClosed);
  forced.set(config.genContactorId, phase.genKmClosed);

  return { forcedContactorPickup: forced };
}

function pickScopeNodes(
  result: ReturnType<CircuitEngine['simulate']>
): TimelineSample['nodes'] {
  const out: TimelineSample['nodes'] = {};
  for (const [id, n] of Object.entries(result.nodes)) {
    out[id] = {
      voltageV: n.voltageV,
      currentA: n.currentA,
      powerW: n.powerW,
      energized: n.energized,
    };
  }
  return out;
}

export function buildAtsTransferTimeline(
  circuit: Circuit,
  opts?: TimelineOptions
): TimelineSample[] {
  const config = resolveAtsConfig(circuit);
  if (!config) {
    return [];
  }

  const durationMs = opts?.durationMs ?? config.durationMs;
  const stepMs = opts?.stepMs ?? 100;
  const simEngine = new CircuitEngine();
  const samples: TimelineSample[] = [];

  for (let t = 0; t <= durationMs; t += stepMs) {
    const cloned = structuredClone(circuit);
    const phase = getAtsPhaseAtTime(config, t);
    const overrides = applyAtsPhaseToCircuit(cloned, config, phase);
    const result = simEngine.simulate(cloned, 0, t, overrides);
    samples.push({
      timeMs: t,
      nodes: pickScopeNodes(result),
      atsPhase: phase.kind,
      atsPhaseLabel: phase.label,
    });
  }

  return computeMotorThermalTimeline(samples, circuit);
}

export function validateAtsInstallation(
  circuit: Circuit
): CircuitValidationIssue[] {
  const config = resolveAtsConfig(circuit);
  if (!config) return [];

  const issues: CircuitValidationIssue[] = [];
  const ids = [
    config.controllerId,
    config.utilitySourceId,
    config.genSourceId,
    config.utilityContactorId,
    config.genContactorId,
  ];

  const controller = circuit.components.find((c) => c.id === config.controllerId);
  if (controller?.properties.selectorPosition !== 'AUTO') {
    issues.push({
      id: `ats-not-auto-${config.controllerId}`,
      severity: 'warning',
      message: `ATS controller "${config.controllerLabel}" is not in AUTO — automatic transfer sequence will not run.`,
      componentIds: [config.controllerId],
    });
  }

  if (config.interlockRequired) {
    const hasInterlock = circuit.components.some(
      (c) =>
        c.type === 'mechanical_interlock' &&
        (((c.properties.interlockContactorId1 === config.utilityContactorId &&
          c.properties.interlockContactorId2 === config.genContactorId) ||
          (c.properties.interlockContactorId1 === config.genContactorId &&
            c.properties.interlockContactorId2 === config.utilityContactorId)) ||
          (!c.properties.interlockContactorId1 && !c.properties.interlockContactorId2))
    );
    if (!hasInterlock) {
      issues.push({
        id: 'ats-no-interlock',
        severity: 'warning',
        message:
          'ATS interlock required but no mechanical interlock symbol found — both contactor coils could close together.',
        componentIds: ids,
      });
    }
  }

  const checkTimes = [
    0,
    config.utilityFailAtMs,
    config.utilityFailAtMs + config.genStartDelayMs,
    config.utilityFailAtMs + config.genStartDelayMs + config.transferDelayMs,
    config.durationMs,
    ...(config.utilityRestoreAtMs != null ? [config.utilityRestoreAtMs] : []),
  ];
  for (const t of checkTimes) {
    const phase = getAtsPhaseAtTime(config, t);
    if (
      phase.utilitySourceOn &&
      phase.genSourceOn &&
      phase.utilityKmClosed &&
      phase.genKmClosed
    ) {
      issues.push({
        id: 'ats-parallel-sources',
        severity: 'error',
        message:
          'ATS sequence would parallel both live sources onto the bus — check interlock, transition mode, and contactor wiring.',
        componentIds: [config.utilityContactorId, config.genContactorId],
      });
      break;
    }
  }

  if (config.transition === 'open') {
    const breakPhase = getAtsPhaseAtTime(
      config,
      config.utilityFailAtMs +
        config.genStartDelayMs +
        config.transferDelayMs +
        Math.floor(config.openTransitionGapMs / 2)
    );
    if (breakPhase.utilityKmClosed && breakPhase.genKmClosed) {
      issues.push({
        id: 'ats-open-both-closed',
        severity: 'error',
        message:
          'Open-transition ATS has an interval where both contactors are closed — violates break-before-make.',
        componentIds: [config.utilityContactorId, config.genContactorId],
      });
    }
  }

  const steadyUtility = getAtsPhaseAtTime(config, 0);
  if (steadyUtility.utilityKmClosed && steadyUtility.genKmClosed) {
    issues.push({
      id: 'ats-both-closed-steady',
      severity: 'error',
      message:
        'Both ATS contactors are closed in the normal utility phase — impossible interlock or wiring.',
      componentIds: [config.utilityContactorId, config.genContactorId],
    });
  }

  return issues;
}
