import type {
  CircuitComponent,
  ComponentType,
  ComponentProperties,
  PhaseSystem,
} from '../types';
import { getDefaultProperties } from './circuitDefaults';
import { mcbLayoutPoles } from './circuitConnectionGeometry';

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
        ['1', '1'],
        ['2', '2'],
        ['IN_L', '1'],
        ['OUT_L', '2'],
      ];
    }
    return [
      ['1', '1'],
      ['2', '2'],
      ['IN', '1'],
      ['OUT', '2'],
    ];
  }
  if (
    (fromType === 'three_phase_mcb' || fromType === 'four_phase_mcb') &&
    toType === 'mcb'
  ) {
    if (fromType === 'four_phase_mcb') {
      return [
        ['1', '1'],
        ['2', '2'],
        ['7', '3'],
        ['8', '4'],
        ['IN_L1', '1'],
        ['OUT_L1', '2'],
        ['IN_N', '3'],
        ['OUT_N', '4'],
        ['IN_L', '1'],
        ['OUT_L', '2'],
      ];
    }
    return [
      ['1', '1'],
      ['2', '2'],
      ['IN_L1', '1'],
      ['OUT_L1', '2'],
    ];
  }
  if (
    (fromType === 'contactor' ||
      fromType === 'relay' ||
      fromType === 'timer') &&
    toType === 'three_phase_contactor'
  ) {
    return [
      ['T1', 'T1'],
      ['T2', 'T2'],
      ['IN', 'T1'],
      ['OUT', 'T2'],
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
      ['T1', 'T1'],
      ['T2', 'T2'],
      ['IN_L1', 'T1'],
      ['OUT_L1', 'T2'],
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

export { resolveTypeFromPhasePreference, morphLabelPairs, mergedPropsMorph };
