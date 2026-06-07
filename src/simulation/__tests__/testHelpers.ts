/**
 * Test helpers — build circuits programmatically for engine tests.
 *
 * Each helper creates minimal Circuit objects with real connection points
 * and wires, matching the same geometry that the production store uses.
 */

import { v4 as uuid } from 'uuid';
import type {
  Circuit,
  CircuitComponent,
  ConnectionPoint,
  ComponentType,
  Wire,
  WireColor,
  ComponentProperties,
} from '../../types';

/* ------------------------------------------------------------------ */
/*  Component factory                                                  */
/* ------------------------------------------------------------------ */

/**
 * Shorthand to create a component with the correct connection points.
 * `overrides` are merged into the default properties.
 */
export function makeComponent(
  type: ComponentType,
  opts?: {
    id?: string;
    label?: string;
    state?: CircuitComponent['state'];
    x?: number;
    y?: number;
    props?: Partial<ComponentProperties>;
    connectionPoints?: ConnectionPoint[];
  }
): CircuitComponent {
  const id = opts?.id ?? uuid();
  const cps = opts?.connectionPoints ?? defaultConnectionPoints(id, type);
  const defaultProps = defaultProperties(type);
  return {
    id,
    type,
    label: opts?.label ?? type,
    x: opts?.x ?? 0,
    y: opts?.y ?? 0,
    rotation: 0,
    state: opts?.state ?? defaultState(type),
    selected: false,
    connectionPoints: cps,
    properties: { ...defaultProps, ...opts?.props },
  };
}

/* ------------------------------------------------------------------ */
/*  Wire factory                                                       */
/* ------------------------------------------------------------------ */

/** Connect two components by terminal label. */
export function wire(
  from: CircuitComponent,
  fromLabel: string,
  to: CircuitComponent,
  toLabel: string,
  opts?: { color?: WireColor; crossSection?: number }
): Wire {
  const fp = from.connectionPoints.find((p) => p.label === fromLabel);
  const tp = to.connectionPoints.find((p) => p.label === toLabel);
  if (!fp) throw new Error(`No terminal "${fromLabel}" on ${from.type} ${from.id}`);
  if (!tp) throw new Error(`No terminal "${toLabel}" on ${to.type} ${to.id}`);
  return {
    id: uuid(),
    fromComponentId: from.id,
    fromPointId: fp.id,
    toComponentId: to.id,
    toPointId: tp.id,
    points: [from.x + fp.x, from.y + fp.y, to.x + tp.x, to.y + tp.y],
    color: opts?.color ?? 'brown',
    crossSection: opts?.crossSection ?? 2.5,
    energized: false,
    currentAmps: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Circuit factory                                                    */
/* ------------------------------------------------------------------ */

export function makeCircuit(
  components: CircuitComponent[],
  wires: Wire[]
): Circuit {
  return {
    id: uuid(),
    name: 'Test Circuit',
    components,
    wires,
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phaseImbalanceWarningPercent: 15,
    wireLabelsVisible: true,
    continuityPowerThresholdW: 0.5,
  };
}

/* ------------------------------------------------------------------ */
/*  Minimal default properties (mirrors circuitDefaults.ts)            */
/* ------------------------------------------------------------------ */

function defaultProperties(type: ComponentType): ComponentProperties {
  switch (type) {
    case 'power_source':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'dc_power_source':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'mcb':
      return {
        ratingAmps: 16, tripCurve: 'C', breakingCapacity: 6000,
        poles: 1, phaseSystem: 'single_phase',
      };
    case 'lamp':
      return {
        powerWatts: 60, loadType: 'resistive', powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'motor':
      return {
        powerWatts: 1000, loadType: 'inductive', powerFactor: 0.8,
        phaseSystem: 'single_phase',
      };
    case 'generic_load':
      return {
        powerWatts: 100, loadType: 'resistive', powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'heater':
      return {
        powerWatts: 2000, loadType: 'resistive', powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'switch':
      return { switchType: 'SPST', poles: 1, phaseSystem: 'single_phase' };
    case 'three_phase_source':
      return {
        phaseSystem: 'three_phase', lineVoltage: 400,
        phaseVoltage: 400 / Math.sqrt(3), voltage: 400,
      };
    case 'three_phase_motor':
      return {
        powerWatts: 3000, loadType: 'inductive', powerFactor: 0.85,
        lineVoltage: 400, phaseSystem: 'three_phase', ratedLineAmps: 5.5,
      };
    case 'three_phase_mcb':
      return {
        ratingAmps: 16, tripCurve: 'C', breakingCapacity: 6000,
        poles: 3, lineVoltage: 400, phaseSystem: 'three_phase',
      };
    case 'air_circuit_breaker':
      return {
        ratingAmps: 630, breakingCapacity: 10000, poles: 4,
        lineVoltage: 400, phaseSystem: 'three_phase',
        acbInstantaneousMult: 10, acbShortTimeMult: 6,
        acbEarthFaultEnabled: true, acbEarthFaultAmps: 120,
        acbLineFrequencyHz: 50, acbShortTimeDelayS: 0.18,
        acbEarthFaultDelayS: 0.1, acbThermalTripIntegral: 80,
        acbBmsEnabled: false, acbBmsUvrEnergized: true,
        acbBmsSpringCharged: true, acbBmsProtocol: 'none' as const,
      };
    case 'motorized_mccb':
      return {
        ratingAmps: 63, tripCurve: 'C', breakingCapacity: 10000,
        poles: 3, lineVoltage: 400, phaseSystem: 'three_phase',
        mccbBmsEnabled: false, mccbBmsCtrlVoltageOk: true,
        mccbBmsMotorReady: true, mccbBmsProtocol: 'none' as const,
      };
    case 'contactor':
      return { ratingAmps: 25, phaseSystem: 'single_phase' };
    case 'junction':
      return { phaseSystem: 'single_phase' };
    default:
      return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Connection point templates                                         */
/* ------------------------------------------------------------------ */

function defaultConnectionPoints(
  componentId: string,
  type: ComponentType
): ConnectionPoint[] {
  const cp = (x: number, y: number, label: string): ConnectionPoint => ({
    id: uuid(), componentId, x, y, label,
  });

  switch (type) {
    case 'power_source':
      return [cp(-16, 32, 'L_OUT'), cp(16, 32, 'N_OUT')];
    case 'dc_power_source':
      return [cp(-16, 32, 'DC_PLUS'), cp(16, 32, 'DC_MINUS')];
    case 'mcb':
      return [cp(0, -25, '1'), cp(0, 25, '2')];
    case 'overload_relay':
      return [cp(0, -25, '1'), cp(0, 25, '2')];
    case 'switch':
      return [cp(0, -20, '1'), cp(0, 20, '2')];
    case 'lamp':
    case 'motor':
    case 'heater':
    case 'generic_load':
      return [cp(0, -20, 'T1'), cp(0, 20, 'T2')];
    case 'contactor':
      return [
        cp(0, -25, 'T1'), cp(0, 25, 'T2'),
        cp(-20, 0, 'A1'), cp(20, 0, 'A2'),
        cp(-12, 38, '13'), cp(-12, 50, '14'),
        cp(12, 38, '21'), cp(12, 50, '22'),
      ];
    case 'three_phase_source':
      return [
        cp(-20, -32, 'L1_OUT'), cp(0, -32, 'L2_OUT'),
        cp(20, -32, 'L3_OUT'), cp(0, 32, 'N_OUT'),
      ];
    case 'three_phase_motor':
      return [
        cp(-20, -22, 'L1'), cp(0, -22, 'L2'),
        cp(20, -22, 'L3'), cp(0, 22, 'N'),
      ];
    case 'three_phase_mcb':
      return [
        cp(-20, -25, '1'), cp(-20, 25, '2'),
        cp(0, -25, '3'), cp(0, 25, '4'),
        cp(20, -25, '5'), cp(20, 25, '6'),
      ];
    case 'air_circuit_breaker':
      return [
        // Power poles
        cp(-30, -36, '1'), cp(-30, 42, '2'),
        cp(-10, -36, '3'), cp(-10, 42, '4'),
        cp(10, -36, '5'), cp(10, 42, '6'),
        cp(30, -36, '7'), cp(30, 42, '8'),
        // Control block
        cp(-56, -26, 'CC_A1'), cp(-56, -18, 'CC_A2'),
        cp(-56, -10, 'ST_A1'), cp(-56, -2, 'ST_A2'),
        cp(-56, 6, 'UVR_A1'), cp(-56, 14, 'UVR_A2'),
        cp(-56, 22, 'AUX_52A'), cp(-56, 30, 'AUX_52B'),
        cp(-56, 38, 'AUX_TRIP'),
      ];
    case 'motorized_mccb':
      return [
        // Power poles (3P)
        cp(-20, -36, '1'), cp(-20, 42, '2'),
        cp(0, -36, '3'), cp(0, 42, '4'),
        cp(20, -36, '5'), cp(20, 42, '6'),
        // Control block
        cp(-46, -26, 'MOT_A1'), cp(-46, -18, 'MOT_A2'),
        cp(-46, -10, 'ST_A1'), cp(-46, -2, 'ST_A2'),
        cp(-46, 6, 'AUX_COM'), cp(-46, 14, 'AUX_NO'),
        cp(-46, 22, 'AUX_NC'),
        cp(-46, 30, 'TRIP_T1'), cp(-46, 38, 'TRIP_T2'),
      ];
    case 'junction':
      return [
        cp(0, 0, 'T1'),
      ];
    case 'smps':
    case 'ac_dc_converter':
      return [
        cp(-22, -26, 'AC_L'),
        cp(22, -26, 'AC_N'),
        cp(-22, 26, 'DC_PLUS'),
        cp(22, 26, 'DC_MINUS'),
      ];
    case 'dc_battery_backup':
      return [cp(-14, -22, 'BAT_POS'), cp(14, -22, 'BAT_NEG')];
    case 'ups_module':
      return [
        cp(-30, -12, 'AC_IN_L'),
        cp(-30, -2, 'AC_IN_N'),
        cp(30, -12, 'AC_OUT_L'),
        cp(30, -2, 'AC_OUT_N'),
        cp(-10, 24, 'BAT_POS'),
        cp(10, 24, 'BAT_NEG'),
      ];
    default:
      return [cp(0, -20, 'T1'), cp(0, 20, 'T2')];
  }
}

function defaultState(type: ComponentType): CircuitComponent['state'] {
  const startsOff = new Set<ComponentType>([
    'switch', 'push_button', 'mcb', 'hrc_fuse', 'control_circuit_fuse',
    'contactor', 'relay', 'timer', 'overload_relay',
    'three_phase_mcb', 'mccb', 'motor_protection_circuit_breaker',
    'four_phase_mcb', 'motorized_mccb', 'four_pole_motorized_mccb',
    'air_circuit_breaker', 'three_phase_contactor', 'four_phase_contactor',
    'interposing_relay', 'aux_contact_block',
    'rcd', 'residual_current_circuit_breaker',
    'earth_leakage_relay_cbct',
  ]);
  return startsOff.has(type) ? 'off' : 'on';
}
