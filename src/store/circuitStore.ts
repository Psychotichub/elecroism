import { create } from 'zustand';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  SimulationResult,
  ToolMode,
  HistoryEntry,
  ConnectionPoint,
  ComponentType,
  ComponentProperties,
  FaultEvent,
  PhaseSystem,
} from '../types';
import { engine } from '../simulation/engine';
import { v4 as uuid } from 'uuid';
import {
  clampComponentScale,
  connectionPointWorld,
} from '../utils/geometry';
import {
  inferWireColor,
  inferWireColorFromSingleTerminal,
} from '../utils/inferWireColor';

function getConnectionPointAbsolutePosition(
  circuit: Circuit,
  componentId: string,
  pointId: string
): { x: number; y: number } | null {
  const comp = circuit.components.find((c) => c.id === componentId);
  if (!comp) return null;
  const point = comp.connectionPoints.find((p) => p.id === pointId);
  if (!point) return null;
  return connectionPointWorld(comp, point);
}

type CreateConnectionPointsOptions = {
  /** Single-phase MCB: 1 pole (IN/OUT) or 2 pole (IN_L/OUT_L + IN_N/OUT_N). */
  mcbPoles?: 1 | 2;
};

function createMcbConnectionPoints(
  componentId: string,
  poles: 1 | 2
): ConnectionPoint[] {
  if (poles === 2) {
    return [
      { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L' },
      { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L' },
      { id: uuid(), componentId, x: 10, y: -25, label: 'IN_N' },
      { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_N' },
    ];
  }
  return [
    { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
    { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
  ];
}

function syncWireEndpoints(circuit: Circuit): Circuit {
  return {
    ...circuit,
    wires: circuit.wires.map((wire) => {
      const fromPos = getConnectionPointAbsolutePosition(
        circuit,
        wire.fromComponentId,
        wire.fromPointId
      );
      const toPos = getConnectionPointAbsolutePosition(
        circuit,
        wire.toComponentId,
        wire.toPointId
      );

      if (!fromPos || !toPos) return wire;

      const points =
        wire.points.length >= 4
          ? [...wire.points]
          : [fromPos.x, fromPos.y, toPos.x, toPos.y];

      points[0] = fromPos.x;
      points[1] = fromPos.y;
      points[points.length - 2] = toPos.x;
      points[points.length - 1] = toPos.y;

      return { ...wire, points };
    }),
  };
}

/** BMS / motor-pack control terminals (diagram only — not in power graph). */
function acbControlConnectionPoints(componentId: string): ConnectionPoint[] {
  const x = -46;
  const rows: [number, string][] = [
    [-26, 'CC_A1'],
    [-18, 'CC_A2'],
    [-10, 'ST_A1'],
    [-2, 'ST_A2'],
    [6, 'UVR_A1'],
    [14, 'UVR_A2'],
    [22, 'AUX_52A'],
    [30, 'AUX_52B'],
    [38, 'AUX_TRIP'],
  ];
  return rows.map(([y, label]) => ({
    id: uuid(),
    componentId,
    x,
    y,
    label,
  }));
}

function ensureAcbControlConnectionPoints(
  component: CircuitComponent
): CircuitComponent {
  if (component.type !== 'air_circuit_breaker') return component;
  if (component.connectionPoints.some((p) => p.label === 'CC_A1')) {
    return component;
  }
  return {
    ...component,
    connectionPoints: [
      ...component.connectionPoints,
      ...acbControlConnectionPoints(component.id),
    ],
  };
}

function createConnectionPoints(
  componentId: string,
  type: ComponentType,
  options?: CreateConnectionPointsOptions
): ConnectionPoint[] {
  switch (type) {
    case 'power_source':
      return [
        { id: uuid(), componentId, x: -16, y: 32, label: 'L_OUT' },
        { id: uuid(), componentId, x: 16, y: 32, label: 'N_OUT' },
      ];
    case 'three_phase_source':
      return [
        { id: uuid(), componentId, x: -20, y: -32, label: 'L1_OUT' },
        { id: uuid(), componentId, x: 0, y: -32, label: 'L2_OUT' },
        { id: uuid(), componentId, x: 20, y: -32, label: 'L3_OUT' },
        { id: uuid(), componentId, x: 0, y: 32, label: 'N_OUT' },
      ];
    case 'three_phase_motor':
      return [
        { id: uuid(), componentId, x: -20, y: -22, label: 'L1' },
        { id: uuid(), componentId, x: 0, y: -22, label: 'L2' },
        { id: uuid(), componentId, x: 20, y: -22, label: 'L3' },
        { id: uuid(), componentId, x: 0, y: 22, label: 'N' },
      ];
    case 'three_phase_mcb':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
      ];
    case 'four_phase_mcb':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
      ];
    case 'air_circuit_breaker':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
        ...acbControlConnectionPoints(componentId),
      ];
    case 'switch':
    case 'push_button':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
    case 'mcb':
      return createMcbConnectionPoints(
        componentId,
        options?.mcbPoles === 2 ? 2 : 1
      );
    case 'rcd':
    case 'overload_relay':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
      ];
    case 'socket':
      return [
        { id: uuid(), componentId, x: -10, y: -20, label: 'L' },
        { id: uuid(), componentId, x: 10, y: -20, label: 'N' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'PE' },
      ];
    case 'lamp':
    case 'motor':
    case 'heater':
    case 'generic_load':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'T1' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'T2' },
      ];
    case 'busbar':
      return Array.from({ length: 6 }, (_, i) => ({
        id: uuid(),
        componentId,
        x: -50 + i * 20,
        y: 0,
        label: `TAP_${i + 1}`,
      }));
    case 'junction':
      return [
        { id: uuid(), componentId, x: 0, y: -8, label: 'T1' },
        { id: uuid(), componentId, x: 8, y: 0, label: 'T2' },
        { id: uuid(), componentId, x: 0, y: 8, label: 'T3' },
        { id: uuid(), componentId, x: -8, y: 0, label: 'T4' },
      ];
    case 'contactor':
    case 'relay':
    case 'timer':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
        { id: uuid(), componentId, x: -20, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 20, y: 0, label: 'A2' },
      ];
    case 'three_phase_contactor':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: -36, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 36, y: 0, label: 'A2' },
      ];
    case 'four_phase_contactor':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
        { id: uuid(), componentId, x: -44, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 44, y: 0, label: 'A2' },
      ];
    default:
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
  }
}

function labelNorm(s: string): string {
  return s.replace(/\s+/g, '').toUpperCase();
}

/** Effective 1P vs 2P layout for an MCB (from properties or legacy connection labels). */
function mcbLayoutPoles(comp: CircuitComponent): 1 | 2 {
  if (comp.type !== 'mcb') return 1;
  if (comp.properties.poles === 2) return 2;
  if (
    comp.connectionPoints.some((cp) => labelNorm(cp.label) === 'IN_L')
  ) {
    return 2;
  }
  return 1;
}

function remapWireEndpointsForMorph(
  wires: Wire[],
  componentId: string,
  oldToNewPointId: Map<string, string>
): Wire[] {
  return wires
    .map((w) => {
      let fromPointId = w.fromPointId;
      let toPointId = w.toPointId;
      if (w.fromComponentId === componentId) {
        const n = oldToNewPointId.get(w.fromPointId);
        if (n === undefined) return null;
        fromPointId = n;
      }
      if (w.toComponentId === componentId) {
        const n = oldToNewPointId.get(w.toPointId);
        if (n === undefined) return null;
        toPointId = n;
      }
      return { ...w, fromPointId, toPointId };
    })
    .filter((w): w is Wire => w !== null);
}

function buildPointRemapByLabels(
  oldComp: CircuitComponent,
  newCps: ConnectionPoint[],
  pairs: [string, string][]
): Map<string, string> {
  const newByLabel = new Map(
    newCps.map((cp) => [labelNorm(cp.label), cp.id] as const)
  );
  const m = new Map<string, string>();
  for (const cp of oldComp.connectionPoints) {
    const hit = pairs.find(
      ([from]) => labelNorm(from) === labelNorm(cp.label)
    );
    if (!hit) continue;
    const newId = newByLabel.get(labelNorm(hit[1]));
    if (newId) m.set(cp.id, newId);
  }
  return m;
}

/** Target canvas `type` when user sets phase system (may equal current). */
function resolveTypeFromPhasePreference(
  type: ComponentType,
  phase: PhaseSystem
): ComponentType {
  if (phase === 'three_phase') {
    switch (type) {
      case 'power_source':
        return 'three_phase_source';
      case 'motor':
        return 'three_phase_motor';
      case 'mcb':
        return 'three_phase_mcb';
      case 'contactor':
      case 'relay':
      case 'timer':
        return 'three_phase_contactor';
      default:
        return type;
    }
  }
  switch (type) {
    case 'three_phase_source':
      return 'power_source';
    case 'three_phase_motor':
      return 'motor';
    case 'three_phase_mcb':
    case 'four_phase_mcb':
      return 'mcb';
    case 'three_phase_contactor':
    case 'four_phase_contactor':
      return 'contactor';
    default:
      return type;
  }
}

function morphLabelPairs(
  fromComp: CircuitComponent,
  toType: ComponentType
): [string, string][] | null {
  const fromType = fromComp.type;
  if (fromType === 'power_source' && toType === 'three_phase_source') {
    return [
      ['L_OUT', 'L1_OUT'],
      ['N_OUT', 'N_OUT'],
    ];
  }
  if (fromType === 'three_phase_source' && toType === 'power_source') {
    return [
      ['L1_OUT', 'L_OUT'],
      ['N_OUT', 'N_OUT'],
    ];
  }
  if (fromType === 'motor' && toType === 'three_phase_motor') {
    return [
      ['T1', 'L1'],
      ['T2', 'N'],
    ];
  }
  if (fromType === 'three_phase_motor' && toType === 'motor') {
    return [
      ['L1', 'T1'],
      ['N', 'T2'],
    ];
  }
  if (fromType === 'mcb' && toType === 'three_phase_mcb') {
    if (mcbLayoutPoles(fromComp) === 2) {
      return [
        ['IN_L', 'IN_L1'],
        ['OUT_L', 'OUT_L1'],
      ];
    }
    return [
      ['IN', 'IN_L1'],
      ['OUT', 'OUT_L1'],
    ];
  }
  if (
    (fromType === 'three_phase_mcb' || fromType === 'four_phase_mcb') &&
    toType === 'mcb'
  ) {
    if (fromType === 'four_phase_mcb') {
      return [
        ['IN_L1', 'IN_L'],
        ['OUT_L1', 'OUT_L'],
        ['IN_N', 'IN_N'],
        ['OUT_N', 'OUT_N'],
      ];
    }
    return [
      ['IN_L1', 'IN'],
      ['OUT_L1', 'OUT'],
    ];
  }
  if (
    (fromType === 'contactor' ||
      fromType === 'relay' ||
      fromType === 'timer') &&
    toType === 'three_phase_contactor'
  ) {
    return [
      ['IN', 'IN_L1'],
      ['OUT', 'OUT_L1'],
      ['A1', 'A1'],
      ['A2', 'A2'],
    ];
  }
  if (
    (fromType === 'three_phase_contactor' ||
      fromType === 'four_phase_contactor') &&
    toType === 'contactor'
  ) {
    return [
      ['IN_L1', 'IN'],
      ['OUT_L1', 'OUT'],
      ['A1', 'A1'],
      ['A2', 'A2'],
    ];
  }
  return null;
}

function mergedPropsMorph(
  comp: CircuitComponent,
  toType: ComponentType
): ComponentProperties {
  const base = getDefaultProperties(toType);
  const p = comp.properties;

  if (comp.type === 'power_source' && toType === 'three_phase_source') {
    const vLn = p.voltage || 230;
    const vLL = vLn * Math.sqrt(3);
    return {
      ...base,
      phaseSystem: 'three_phase',
      lineVoltage: vLL,
      voltage: vLL,
      phaseVoltage: vLn,
    };
  }
  if (comp.type === 'three_phase_source' && toType === 'power_source') {
    const vLn =
      p.phaseVoltage ?? (p.lineVoltage ?? 400) / Math.sqrt(3);
    return {
      ...base,
      phaseSystem: 'single_phase',
      voltage: Math.round(vLn * 10) / 10,
    };
  }
  if (comp.type === 'motor' && toType === 'three_phase_motor') {
    return {
      ...base,
      powerWatts: p.powerWatts ?? base.powerWatts,
      loadType: p.loadType ?? base.loadType,
      powerFactor: p.powerFactor ?? base.powerFactor,
      ratedLineAmps: p.ratedLineAmps,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'three_phase',
    };
  }
  if (comp.type === 'three_phase_motor' && toType === 'motor') {
    const vLn =
      p.phaseVoltage ??
      (p.lineVoltage ? p.lineVoltage / Math.sqrt(3) : undefined);
    return {
      ...base,
      powerWatts: p.powerWatts ?? base.powerWatts,
      loadType: p.loadType ?? base.loadType,
      powerFactor: p.powerFactor ?? base.powerFactor,
      voltage: vLn !== undefined ? Math.round(vLn * 10) / 10 : 230,
      phaseSystem: 'single_phase',
    };
  }
  if (comp.type === 'mcb' && toType === 'three_phase_mcb') {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      tripCurve: p.tripCurve ?? base.tripCurve,
      breakingCapacity: p.breakingCapacity ?? base.breakingCapacity,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'three_phase',
    };
  }
  if (comp.type === 'four_phase_mcb' && toType === 'mcb') {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      tripCurve: p.tripCurve ?? base.tripCurve,
      breakingCapacity: p.breakingCapacity ?? base.breakingCapacity,
      poles: 2,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'single_phase',
    };
  }
  if (comp.type === 'three_phase_mcb' && toType === 'mcb') {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      tripCurve: p.tripCurve ?? base.tripCurve,
      breakingCapacity: p.breakingCapacity ?? base.breakingCapacity,
      poles: 1,
      phaseSystem: 'single_phase',
    };
  }
  if (
    (comp.type === 'contactor' ||
      comp.type === 'relay' ||
      comp.type === 'timer') &&
    toType === 'three_phase_contactor'
  ) {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'three_phase',
    };
  }
  if (
    (comp.type === 'three_phase_contactor' ||
      comp.type === 'four_phase_contactor') &&
    toType === 'contactor'
  ) {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      phaseSystem: 'single_phase',
    };
  }
  return { ...base, ...p, phaseSystem: p.phaseSystem ?? base.phaseSystem };
}

function getDefaultProperties(type: ComponentType): ComponentProperties {
  switch (type) {
    case 'power_source':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'three_phase_source':
      return {
        phaseSystem: 'three_phase',
        lineVoltage: 400,
        phaseVoltage: 400 / Math.sqrt(3),
        voltage: 400,
      };
    case 'three_phase_motor':
      return {
        powerWatts: 3000,
        loadType: 'inductive',
        powerFactor: 0.85,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        ratedLineAmps: 5.5,
      };
    case 'three_phase_mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'four_phase_mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'air_circuit_breaker':
      return {
        ratingAmps: 630,
        breakingCapacity: 10000,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        acbInstantaneousMult: 10,
        acbShortTimeMult: 6,
        acbEarthFaultEnabled: true,
        acbEarthFaultAmps: 120,
        acbLineFrequencyHz: 50,
        acbShortTimeDelayS: 0.18,
        acbEarthFaultDelayS: 0.1,
        acbThermalTripIntegral: 80,
        acbBmsEnabled: false,
        acbBmsUvrEnergized: true,
        acbBmsSpringCharged: true,
        acbBmsProtocol: 'none' as const,
        acbCtrlSupply: '24dc',
        acbCtrlFuseDesignation: 'F1',
        acbCtrlFuseAmps: 2,
        acbRelayCcId: 'K1',
        acbRelayStId: 'K2',
        acbBmsDoCloseTag: 'DO-CC',
        acbBmsDoOpenTag: 'DO-ST',
        acbBmsDi52aTag: 'DI-52a',
        acbBmsDi52bTag: 'DI-52b',
        acbBmsDiTripTag: 'DI-TRIP',
      };
    case 'three_phase_contactor':
      return {
        ratingAmps: 25,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'four_phase_contactor':
      return {
        ratingAmps: 25,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'switch':
      return { switchType: 'SPST', poles: 1, phaseSystem: 'single_phase' };
    case 'push_button':
      return { buttonType: 'NO', phaseSystem: 'single_phase' };
    case 'mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 1,
        phaseSystem: 'single_phase',
      };
    case 'rcd':
      return {
        ratingAmps: 40,
        rcdSensitivity: 30,
        poles: 2,
        phaseSystem: 'single_phase',
      };
    case 'overload_relay':
      return { ratingAmps: 16, phaseSystem: 'single_phase' };
    case 'socket':
      return {
        socketType: 'schuko',
        voltage: 230,
        ratingAmps: 16,
        phaseSystem: 'single_phase',
      };
    case 'lamp':
      return {
        powerWatts: 60,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'motor':
      return {
        powerWatts: 1000,
        loadType: 'inductive',
        powerFactor: 0.8,
        phaseSystem: 'single_phase',
      };
    case 'heater':
      return {
        powerWatts: 2000,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'generic_load':
      return {
        powerWatts: 100,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'busbar':
      return { wireColor: 'brown', phaseSystem: 'single_phase' };
    case 'contactor':
    case 'relay':
    case 'timer':
      return { ratingAmps: 25, phaseSystem: 'single_phase' };
    case 'junction':
      return { phaseSystem: 'single_phase' };
    case 'wire':
      return { phaseSystem: 'single_phase' };
    default:
      return {};
  }
}

function getDefaultLabel(type: ComponentType): string {
  const labels: Record<string, string> = {
    power_source: 'AC Supply',
    switch: 'Switch',
    push_button: 'PB',
    mcb: 'MCB',
    rcd: 'RCD',
    overload_relay: 'OLR',
    socket: 'Socket',
    lamp: 'Lamp',
    motor: 'Motor',
    heater: 'Heater',
    generic_load: 'Load',
    busbar: 'Busbar',
    junction: 'Junction',
    contactor: 'Contactor',
    relay: 'Relay',
    timer: 'Timer',
    three_phase_source: '3φ Supply',
    three_phase_motor: '3φ Motor',
    three_phase_mcb: '3P MCB',
    four_phase_mcb: '4P MCB',
    air_circuit_breaker: 'ACB',
    three_phase_contactor: '3P KM',
    four_phase_contactor: '4P KM',
  };
  return labels[type] || type;
}

function getInitialState(type: ComponentType): CircuitComponent['state'] {
  // Components that represent user-operated switching/protection start open/off.
  const startsOff = new Set<ComponentType>([
    'switch',
    'push_button',
    'mcb',
    'rcd',
    'contactor',
    'relay',
    'timer',
    'overload_relay',
    'three_phase_mcb',
    'four_phase_mcb',
    'air_circuit_breaker',
    'three_phase_contactor',
    'four_phase_contactor',
  ]);

  if (type === 'push_button') return 'off';
  return startsOff.has(type) ? 'off' : 'on';
}

function createEmptyCircuit(): Circuit {
  return {
    id: uuid(),
    name: 'New Circuit',
    components: [],
    wires: [],
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface CircuitStore {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
  selectedId: string | null;
  tool: ToolMode;
  wireInProgress: Partial<Wire> | null;
  wirePoints: number[];
  history: HistoryEntry[];
  historyIndex: number;
  faultDialogEvent: FaultEvent | null;

  addComponent: (
    type: ComponentType,
    x: number,
    y: number,
    options?: {
      pushButtonVariant?: 'NO' | 'NC';
      mcbInitialPoles?: 1 | 2;
      initialScale?: number;
    }
  ) => void;
  setMcbPoleLayout: (id: string, poles: 1 | 2) => void;
  setPushButtonPressed: (id: string, pressed: boolean) => void;
  updateComponent: (
    id: string,
    updates: Partial<CircuitComponent>
  ) => void;
  setComponentPhaseSystem: (id: string, phase: PhaseSystem) => void;
  removeComponent: (id: string) => void;
  toggleComponent: (id: string) => void;
  resetTripped: (id: string) => void;
  /** BMS closing coil (CC) pulse — closes main contacts if interlocks OK */
  acbBmsClosePulse: (id: string) => void;
  /** BMS shunt trip — opens main contacts (remote OFF) */
  acbBmsShuntOpen: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  rotateComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;

  addWire: (wire: Omit<Wire, 'id'>) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  removeWire: (id: string) => void;
  startWire: (componentId: string, pointId: string) => void;
  addWirePoint: (x: number, y: number) => void;
  finishWire: (componentId: string, pointId: string) => void;
  cancelWire: () => void;

  setSelected: (id: string | null) => void;
  setTool: (tool: ToolMode) => void;
  setZoom: (zoom: number) => void;
  /** Zoom to `zoom` while keeping the world point under (stageX, stageY) fixed; coords match Konva `getPointerPosition()`. */
  setZoomAroundStagePoint: (
    zoom: number,
    stageX: number,
    stageY: number
  ) => void;
  setPan: (x: number, y: number) => void;

  runSimulation: () => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: Circuit) => void;
  saveCircuit: () => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  dismissFault: () => void;
}

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  circuit: createEmptyCircuit(),
  simulationResult: null,
  selectedId: null,
  tool: 'select',
  wireInProgress: null,
  wirePoints: [],
  history: [],
  historyIndex: -1,
  faultDialogEvent: null,

  addComponent: (type, x, y, options) => {
    const id = uuid();
    const baseProps = getDefaultProperties(type);
    let properties =
      type === 'push_button' && options?.pushButtonVariant === 'NC'
        ? { ...baseProps, buttonType: 'NC' as const }
        : baseProps;
    if (type === 'mcb' && options?.mcbInitialPoles === 2) {
      properties = { ...properties, poles: 2 };
    }
    const mcbPolesForCp =
      type === 'mcb' ? (properties.poles === 2 ? 2 : 1) : undefined;
    const newComp: CircuitComponent = {
      id,
      type,
      label: getDefaultLabel(type),
      x,
      y,
      scale: clampComponentScale(options?.initialScale ?? 1),
      rotation: 0,
      state: getInitialState(type),
      ...(type === 'push_button' ? { pressed: false } : {}),
      selected: false,
      connectionPoints: createConnectionPoints(id, type, {
        mcbPoles: mcbPolesForCp,
      }),
      properties,
    };
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: [...state.circuit.components, newComp],
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory(`Added ${type}`);
    get().runSimulation();
  },

  setMcbPoleLayout: (id, poles) => {
    const circuit = get().circuit;
    const comp = circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'mcb') return;
    const clamped: 1 | 2 = poles === 2 ? 2 : 1;
    const prevLayout = mcbLayoutPoles(comp);
    if (prevLayout === clamped) {
      if (comp.properties.poles !== clamped) {
        get().updateComponent(id, {
          properties: { ...comp.properties, poles: clamped },
        });
        get().pushHistory(`MCB poles: ${clamped}P`);
      }
      return;
    }
    const newCps = createConnectionPoints(comp.id, 'mcb', {
      mcbPoles: clamped,
    });
    const pairs: [string, string][] =
      prevLayout === 1 && clamped === 2
        ? [
            ['IN', 'IN_L'],
            ['OUT', 'OUT_L'],
          ]
        : [
            ['IN_L', 'IN'],
            ['OUT_L', 'OUT'],
            ['IN_N', 'IN'],
            ['OUT_N', 'OUT'],
          ];
    const remap = buildPointRemapByLabels(comp, newCps, pairs);
    const newWires = remapWireEndpointsForMorph(
      circuit.wires,
      comp.id,
      remap
    );
    const newComp: CircuitComponent = {
      ...comp,
      properties: { ...comp.properties, poles: clamped },
      connectionPoints: newCps,
    };
    const updatedCircuit = syncWireEndpoints({
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? newComp : c
      ),
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: updatedCircuit });
    get().pushHistory(`MCB ${clamped}P layout`);
    get().runSimulation();
  },

  setPushButtonPressed: (id, pressed) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id && c.type === 'push_button' ? { ...c, pressed } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().runSimulation();
  },

  updateComponent: (id, updates) => {
    const next: Partial<CircuitComponent> =
      updates.scale !== undefined
        ? { ...updates, scale: clampComponentScale(updates.scale) }
        : updates;
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, ...next } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().runSimulation();
  },

  setComponentPhaseSystem: (id, phase) => {
    const circuit = get().circuit;
    const comp = circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const nextType = resolveTypeFromPhasePreference(comp.type, phase);
    if (nextType === comp.type) {
      get().updateComponent(id, {
        properties: { ...comp.properties, phaseSystem: phase },
      });
      get().pushHistory(`Phase system: ${phase}`);
      return;
    }
    const newProps = mergedPropsMorph(comp, nextType);
    const mcbPolesForCp =
      nextType === 'mcb'
        ? newProps.poles === 2
          ? 2
          : 1
        : undefined;
    const newCps = createConnectionPoints(comp.id, nextType, {
      mcbPoles: mcbPolesForCp,
    });
    const pairs = morphLabelPairs(comp, nextType);
    if (!pairs) {
      get().updateComponent(id, {
        properties: { ...comp.properties, phaseSystem: phase },
      });
      get().pushHistory(`Phase system: ${phase}`);
      return;
    }
    const remap = buildPointRemapByLabels(comp, newCps, pairs);
    const newComp: CircuitComponent = {
      id: comp.id,
      type: nextType,
      label: comp.label,
      x: comp.x,
      y: comp.y,
      rotation: comp.rotation,
      state: comp.state,
      selected: comp.selected,
      connectionPoints: newCps,
      properties: newProps,
    };
    const newWires = remapWireEndpointsForMorph(
      circuit.wires,
      comp.id,
      remap
    );
    const updatedCircuit = syncWireEndpoints({
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? newComp : c
      ),
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: updatedCircuit });
    get().pushHistory(`Phase ${phase}: ${comp.type} → ${nextType}`);
    get().runSimulation();
  },

  toggleComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const toggleable = [
      'switch',
      'mcb',
      'rcd',
      'three_phase_mcb',
      'four_phase_mcb',
      'air_circuit_breaker',
    ];
    if (toggleable.includes(comp.type) && comp.state !== 'tripped') {
      const newState = comp.state === 'on' ? 'off' : 'on';
      get().updateComponent(id, { state: newState });
      get().pushHistory(`Toggled ${comp.label}`);
    }
  },

  resetTripped: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    const nextState =
      comp?.type === 'three_phase_motor' ? 'on' : 'off';
    const updates: Partial<CircuitComponent> = {
      state: nextState,
    };
    if (comp?.type === 'air_circuit_breaker') {
      updates.acbSimState = undefined;
    }
    get().updateComponent(id, updates);
    get().pushHistory('Reset protection / fault');
  },

  acbBmsClosePulse: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    const p = comp.properties;
    if (!p.acbBmsEnabled) return;
    if (p.acbBmsUvrEnergized === false) return;
    if (p.acbBmsSpringCharged === false) return;
    if (comp.state === 'tripped' || comp.state === 'fault') return;
    get().updateComponent(id, { state: 'on' });
    get().pushHistory('BMS ACB closing coil (CC pulse)');
  },

  acbBmsShuntOpen: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    if (!comp.properties.acbBmsEnabled) return;
    if (comp.state !== 'on') return;
    get().updateComponent(id, { state: 'off' });
    get().pushHistory('BMS ACB shunt trip (remote open)');
  },

  removeComponent: (id) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.filter((c) => c.id !== id),
        wires: state.circuit.wires.filter(
          (w) =>
            w.fromComponentId !== id && w.toComponentId !== id
        ),
        updatedAt: new Date().toISOString(),
      },
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    get().pushHistory('Removed component');
    get().runSimulation();
  },

  moveComponent: (id, x, y) => {
    const gridSize = get().circuit.gridSize;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    const circuit = get().circuit;
    const prev = circuit.components.find((c) => c.id === id);
    if (!prev) return;
    const dx = snappedX - prev.x;
    const dy = snappedY - prev.y;

    let wires = circuit.wires;
    if (dx !== 0 || dy !== 0) {
      wires = circuit.wires.map((w) => {
        const touches =
          w.fromComponentId === id || w.toComponentId === id;
        if (!touches || w.points.length <= 4) return w;
        const pts = [...w.points];
        for (let i = 2; i < pts.length - 2; i += 2) {
          pts[i] += dx;
          pts[i + 1] += dy;
        }
        return { ...w, points: pts };
      });
    }

    set({
      circuit: syncWireEndpoints({
        ...circuit,
        components: circuit.components.map((c) =>
          c.id === id ? { ...c, x: snappedX, y: snappedY } : c
        ),
        wires,
      }),
    });
  },

  rotateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const nextRot = (comp.rotation + 90) % 360;
    set((state) => ({
      circuit: syncWireEndpoints({
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, rotation: nextRot } : c
        ),
        updatedAt: new Date().toISOString(),
      }),
    }));
    get().pushHistory(`Rotated ${comp.label}`);
    get().runSimulation();
  },

  duplicateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const baseScale = { initialScale: comp.scale ?? 1 };
    get().addComponent(
      comp.type,
      comp.x + 60,
      comp.y + 60,
      comp.type === 'push_button'
        ? {
            pushButtonVariant:
              comp.properties.buttonType === 'NC' ? 'NC' : 'NO',
            ...baseScale,
          }
        : comp.type === 'mcb'
          ? {
              mcbInitialPoles: mcbLayoutPoles(comp),
              ...baseScale,
            }
          : baseScale
    );
  },

  addWire: (wire) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: [...state.circuit.wires, { ...wire, id: uuid() }],
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Added wire');
    get().runSimulation();
  },

  updateWire: (id, updates) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === id ? { ...w, ...updates } : w
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Updated wire');
    get().runSimulation();
  },

  removeWire: (id) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.filter((w) => w.id !== id),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Removed wire');
    get().runSimulation();
  },

  startWire: (componentId, pointId) => {
    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    set({
      wireInProgress: {
        fromComponentId: componentId,
        fromPointId: pointId,
        color: inferWireColorFromSingleTerminal(point.label),
        crossSection: 2.5,
        energized: false,
        currentAmps: 0,
      },
      wirePoints: [absX, absY],
    });
  },

  addWirePoint: (x, y) => {
    const gridSize = get().circuit.gridSize;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    set((state) => ({
      wirePoints: [...state.wirePoints, snappedX, snappedY],
    }));
  },

  finishWire: (componentId, pointId) => {
    const wip = get().wireInProgress;
    if (!wip || !wip.fromComponentId || !wip.fromPointId) return;
    if (wip.fromComponentId === componentId) return;

    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const fromComp = get().circuit.components.find(
      (c) => c.id === wip.fromComponentId
    );
    const fromPoint = fromComp?.connectionPoints.find(
      (p) => p.id === wip.fromPointId
    );

    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    const allPoints = [...get().wirePoints, absX, absY];

    get().addWire({
      fromComponentId: wip.fromComponentId,
      fromPointId: wip.fromPointId,
      toComponentId: componentId,
      toPointId: pointId,
      points: allPoints,
      color: inferWireColor(fromPoint?.label || '', point.label),
      crossSection: wip.crossSection || 2.5,
      energized: false,
      currentAmps: 0,
    });

    set({ wireInProgress: null, wirePoints: [] });
  },

  cancelWire: () => {
    set({ wireInProgress: null, wirePoints: [] });
  },

  setSelected: (id) => set({ selectedId: id }),
  setTool: (tool) => {
    set({ tool });
    if (tool !== 'wire') {
      get().cancelWire();
    }
  },
  setZoom: (zoom) =>
    set((state) => ({
      circuit: {
        ...state.circuit,
        zoom: Math.max(0.1, Math.min(5, zoom)),
      },
    })),
  setZoomAroundStagePoint: (zoom, stageX, stageY) =>
    set((state) => {
      const prevZ = state.circuit.zoom;
      const z = Math.max(0.1, Math.min(5, zoom));
      if (Math.abs(z - prevZ) < 1e-12) {
        return state;
      }
      const ratio = z / prevZ;
      const panX = stageX - (stageX - state.circuit.panX) * ratio;
      const panY = stageY - (stageY - state.circuit.panY) * ratio;
      return {
        circuit: {
          ...state.circuit,
          zoom: z,
          panX,
          panY,
        },
      };
    }),
  setPan: (x, y) =>
    set((state) => ({
      circuit: { ...state.circuit, panX: x, panY: y },
    })),

  runSimulation: () => {
    const base = get().circuit;
    const normalized = {
      ...base,
      components: base.components.map(ensureAcbControlConnectionPoints),
    };
    const clonedCircuit = structuredClone(normalized);
    const result = engine.simulate(clonedCircuit, 0, Date.now());
    set({
      circuit: clonedCircuit,
      simulationResult: result,
      faultDialogEvent:
        result.faults.length > 0 ? result.faults[0] : null,
    });
  },

  clearCircuit: () => {
    set({
      circuit: createEmptyCircuit(),
      simulationResult: null,
      selectedId: null,
      history: [],
      historyIndex: -1,
    });
  },

  loadCircuit: (circuit) => {
    let wires = circuit.wires;
    const withPush = circuit.components.map((c) =>
      c.type === 'push_button' && !('pressed' in c)
        ? { ...c, pressed: false }
        : c
    );
    const components = withPush.map((c) => {
      if (c.type !== 'mcb') return c;
      if ((c.properties.poles ?? 1) !== 2) return c;
      if (c.connectionPoints.some((p) => labelNorm(p.label) === 'IN_L')) {
        return c;
      }
      const newCps = createConnectionPoints(c.id, 'mcb', { mcbPoles: 2 });
      const remap = buildPointRemapByLabels(c, newCps, [
        ['IN', 'IN_L'],
        ['OUT', 'OUT_L'],
      ]);
      wires = remapWireEndpointsForMorph(wires, c.id, remap);
      return { ...c, connectionPoints: newCps };
    });
    const withAcbCps = components.map((c) =>
      ensureAcbControlConnectionPoints(c)
    );
    const normalized: Circuit = {
      ...circuit,
      components: withAcbCps,
      wires,
    };
    set({ circuit: normalized, selectedId: null });
    get().runSimulation();
  },

  saveCircuit: () => {
    const data = {
      version: '1.0',
      name: get().circuit.name,
      created: get().circuit.createdAt,
      circuit: {
        components: get().circuit.components,
        wires: get().circuit.wires,
      },
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${get().circuit.name}.esim`;
    a.click();
    URL.revokeObjectURL(url);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      circuit: JSON.parse(
        JSON.stringify(history[newIndex].circuit)
      ),
      historyIndex: newIndex,
    });
    get().runSimulation();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      circuit: JSON.parse(
        JSON.stringify(history[newIndex].circuit)
      ),
      historyIndex: newIndex,
    });
    get().runSimulation();
  },

  pushHistory: (description) => {
    const circuit = JSON.parse(JSON.stringify(get().circuit));
    set((state) => {
      const trimmed = state.history.slice(
        0,
        state.historyIndex + 1
      );
      const newHistory = [
        ...trimmed,
        { circuit, description },
      ].slice(-50);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  dismissFault: () => set({ faultDialogEvent: null }),
}));
