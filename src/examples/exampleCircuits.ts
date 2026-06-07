/**
 * Built-in example circuits.
 *
 * Each function returns a Circuit object ready to pass to `loadCircuit()`.
 * Components are placed on a grid for clean visual layout and wired
 * using the same connection-point geometry as the production store.
 */

import { v4 as uuid } from 'uuid';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  WireColor,
  ComponentType,
  ComponentProperties,
} from '../types';
import {
  createConnectionPoints,
} from '../store/circuitConnectionGeometry';
import {
  getDefaultProperties,
  getDefaultLabel,
  getInitialState,
} from '../store/circuitDefaults';

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function comp(
  type: ComponentType,
  x: number,
  y: number,
  overrides?: {
    id?: string;
    label?: string;
    state?: CircuitComponent['state'];
    props?: Partial<ComponentProperties>;
    scale?: number;
  }
): CircuitComponent {
  const id = overrides?.id ?? uuid();
  return {
    id,
    type,
    label: overrides?.label ?? getDefaultLabel(type),
    x,
    y,
    rotation: 0,
    scale: overrides?.scale,
    state: overrides?.state ?? getInitialState(type),
    selected: false,
    connectionPoints: createConnectionPoints(id, type, {}),
    properties: {
      ...getDefaultProperties(type),
      ...overrides?.props,
    },
  };
}

/**
 * Resolve a terminal by label, tolerating legacy labels used in these demos:
 *  - Junctions are now a single common node, so any T# maps to that terminal.
 *  - Busbars now use TAP_L / TAP_R labels, so sequential TAP_n maps by index.
 */
function resolvePoint(c: CircuitComponent, label: string) {
  const exact = c.connectionPoints.find((p) => p.label === label);
  if (exact) return exact;
  if (c.type === 'junction' || c.type === 'connection_point') {
    return c.connectionPoints[0];
  }
  const tap = label.match(/^TAP_(\d+)$/);
  if (tap) {
    const idx = Number(tap[1]) - 1;
    if (idx >= 0 && idx < c.connectionPoints.length) {
      return c.connectionPoints[idx];
    }
  }
  return undefined;
}

function link(
  from: CircuitComponent,
  fromLabel: string,
  to: CircuitComponent,
  toLabel: string,
  color: WireColor = 'brown',
  crossSection = 2.5
): Wire {
  const fp = resolvePoint(from, fromLabel);
  const tp = resolvePoint(to, toLabel);
  if (!fp) throw new Error(`No "${fromLabel}" on ${from.type} (${from.label})`);
  if (!tp) throw new Error(`No "${toLabel}" on ${to.type} (${to.label})`);
  return {
    id: uuid(),
    fromComponentId: from.id,
    fromPointId: fp.id,
    toComponentId: to.id,
    toPointId: tp.id,
    points: [
      from.x + fp.x, from.y + fp.y,
      to.x + tp.x, to.y + tp.y,
    ],
    color,
    crossSection,
    energized: false,
    currentAmps: 0,
  };
}

function circuit(
  name: string,
  components: CircuitComponent[],
  wires: Wire[]
): Circuit {
  return {
    id: uuid(),
    name,
    components,
    wires,
    gridSize: 20,
    zoom: 1,
    panX: 100,
    panY: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phaseImbalanceWarningPercent: 15,
    wireLabelsVisible: true,
    continuityPowerThresholdW: 0.5,
  };
}

/* ================================================================== */
/*  1. DOL Motor Starter (single-phase)                                */
/* ================================================================== */

export function dolMotorStarter(): Circuit {
  // Layout (top → bottom):
  //   Source (200,80) → MCB (200,200) → Contactor (200,340) → OLR (200,460) → Motor (200,580)
  //   Neutral return path on the right via junctions

  const src = comp('power_source', 200, 80, { label: 'AC Supply' });
  const mcb = comp('mcb', 200, 200, {
    label: 'Q1',
    state: 'on',
    props: { ratingAmps: 16, tripCurve: 'C' },
  });
  const contactor = comp('contactor', 200, 340, {
    label: 'KM1',
    state: 'on',
    props: { ratingAmps: 25 },
  });
  const olr = comp('overload_relay', 200, 460, {
    label: 'F1',
    state: 'on',
    props: { ratingAmps: 10 },
  });
  const motor = comp('motor', 200, 580, {
    label: 'M1',
    props: { powerWatts: 750, loadType: 'inductive', powerFactor: 0.8 },
  });

  // Neutral path junctions
  const jN1 = comp('junction', 320, 112);
  const jN2 = comp('junction', 320, 600);

  const components = [src, mcb, contactor, olr, motor, jN1, jN2];
  const wires: Wire[] = [
    // Live path
    link(src, 'L_OUT', mcb, '1'),
    link(mcb, '2', contactor, 'T1'),
    link(contactor, 'T2', olr, '1'),
    link(olr, '2', motor, 'T1'),
    // Contactor coil: A1 fed from live (post-MCB), A2 to neutral so KM1 picks up
    link(mcb, '2', contactor, 'A1', 'red'),
    link(contactor, 'A2', jN1, 'T1', 'blue'),
    // Neutral return
    link(src, 'N_OUT', jN1, 'T1', 'blue'),
    link(motor, 'T2', jN2, 'T1', 'blue'),
    link(jN2, 'T2', jN1, 'T2', 'blue'),
  ];

  return circuit('DOL Motor Starter', components, wires);
}

/* ================================================================== */
/*  2. Three-Phase Motor Starter with MCB + Contactor                  */
/* ================================================================== */

export function threePhaseMotorStarter(): Circuit {
  const src = comp('three_phase_source', 300, 60, { label: '3φ Supply' });
  const mcb = comp('three_phase_mcb', 300, 200, {
    label: 'Q1',
    state: 'on',
    props: { ratingAmps: 16, tripCurve: 'C' },
  });
  const contactor = comp('three_phase_contactor', 300, 360, {
    label: 'KM1',
    state: 'on',
  });
  const motor = comp('three_phase_motor', 300, 520, {
    label: 'M1',
    props: {
      powerWatts: 5500, powerFactor: 0.85,
      lineVoltage: 400, ratedLineAmps: 12,
    },
  });
  const jN = comp('junction', 420, 92);
  const jN2 = comp('junction', 420, 542);

  const components = [src, mcb, contactor, motor, jN, jN2];
  const wires: Wire[] = [
    // L1
    link(src, 'L1_OUT', mcb, '1', 'brown'),
    link(mcb, '2', contactor, 'T1', 'brown'),
    link(contactor, 'T2', motor, 'L1', 'brown'),
    // L2
    link(src, 'L2_OUT', mcb, '3', 'black'),
    link(mcb, '4', contactor, 'T3', 'black'),
    link(contactor, 'T4', motor, 'L2', 'black'),
    // L3
    link(src, 'L3_OUT', mcb, '5', 'grey'),
    link(mcb, '6', contactor, 'T5', 'grey'),
    link(contactor, 'T6', motor, 'L3', 'grey'),
    // Contactor coil: A1 from L1 (post-MCB), A2 to neutral so KM1 picks up
    link(mcb, '2', contactor, 'A1', 'red'),
    link(contactor, 'A2', jN, 'T1', 'blue'),
    // Neutral
    link(src, 'N_OUT', jN, 'T1', 'blue'),
    link(motor, 'N', jN2, 'T1', 'blue'),
    link(jN2, 'T2', jN, 'T2', 'blue'),
  ];

  return circuit('3-Phase Motor Starter', components, wires);
}

/* ================================================================== */
/*  3. ACB Incomer with BMS Control                                    */
/* ================================================================== */

export function acbIncomerBms(): Circuit {
  const src = comp('three_phase_source', 300, 40, { label: '3φ Main Supply' });
  const acb = comp('air_circuit_breaker', 300, 220, {
    label: 'ACB-1',
    state: 'on',
    props: {
      ratingAmps: 630,
      acbBmsEnabled: true,
      acbBmsUvrEnergized: true,
      acbBmsSpringCharged: true,
      acbBmsProtocol: 'modbus_tcp',
    },
  });
  // One busbar bar per phase — a single busbar commons all its taps, so each
  // phase needs its own bar (otherwise L1/L2/L3 short together).
  const busL1 = comp('busbar_system', 300, 348, { label: 'L1 Bus' });
  const busL2 = comp('busbar_system', 300, 388, { label: 'L2 Bus' });
  const busL3 = comp('busbar_system', 300, 428, { label: 'L3 Bus' });
  const mcb1 = comp('three_phase_mcb', 140, 500, {
    label: 'Q1',
    state: 'on',
    props: { ratingAmps: 32 },
  });
  const mcb2 = comp('three_phase_mcb', 460, 500, {
    label: 'Q2',
    state: 'on',
    props: { ratingAmps: 16 },
  });
  const motor1 = comp('three_phase_motor', 140, 660, {
    label: 'M1 - Pump',
    props: {
      powerWatts: 7500, powerFactor: 0.85,
      lineVoltage: 400, ratedLineAmps: 16,
    },
  });
  const motor2 = comp('three_phase_motor', 460, 660, {
    label: 'M2 - Fan',
    props: {
      powerWatts: 3000, powerFactor: 0.85,
      lineVoltage: 400, ratedLineAmps: 6,
    },
  });
  // Neutral junctions
  const jN = comp('junction', 500, 72);
  const jNM1 = comp('junction', 260, 682);
  const jNM2 = comp('junction', 580, 682);
  const jNBar = comp('junction', 500, 682);

  const components = [
    src, acb, busL1, busL2, busL3, mcb1, mcb2, motor1, motor2,
    jN, jNM1, jNM2, jNBar,
  ];
  const wires: Wire[] = [
    // Source → ACB (L1–L3 through 4P ACB, poles 1-6 = L1-L3)
    link(src, 'L1_OUT', acb, '1', 'brown', 95),
    link(src, 'L2_OUT', acb, '3', 'black', 95),
    link(src, 'L3_OUT', acb, '5', 'grey', 95),
    // ACB → per-phase busbars
    link(acb, '2', busL1, 'TAP_1', 'brown', 95),
    link(acb, '4', busL2, 'TAP_1', 'black', 95),
    link(acb, '6', busL3, 'TAP_1', 'grey', 95),
    // Busbars → Q1 (Feeder 1)
    link(busL1, 'TAP_4', mcb1, '1', 'brown'),
    link(busL2, 'TAP_4', mcb1, '3', 'black'),
    link(busL3, 'TAP_4', mcb1, '5', 'grey'),
    // Q1 → Motor 1
    link(mcb1, '2', motor1, 'L1', 'brown'),
    link(mcb1, '4', motor1, 'L2', 'black'),
    link(mcb1, '6', motor1, 'L3', 'grey'),
    // Busbars → Q2 (Feeder 2)
    link(busL1, 'TAP_5', mcb2, '1', 'brown'),
    link(busL2, 'TAP_5', mcb2, '3', 'black'),
    link(busL3, 'TAP_5', mcb2, '5', 'grey'),
    // Q2 → Motor 2
    link(mcb2, '2', motor2, 'L1', 'brown'),
    link(mcb2, '4', motor2, 'L2', 'black'),
    link(mcb2, '6', motor2, 'L3', 'grey'),
    // Neutral path
    link(src, 'N_OUT', jN, 'T1', 'blue', 95),
    link(motor1, 'N', jNM1, 'T1', 'blue'),
    link(motor2, 'N', jNM2, 'T1', 'blue'),
    link(jNM1, 'T2', jNBar, 'T1', 'blue'),
    link(jNM2, 'T2', jNBar, 'T2', 'blue'),
    link(jNBar, 'T3', jN, 'T2', 'blue', 95),
  ];

  return circuit('ACB Incomer with BMS', components, wires);
}

/* ================================================================== */
/*  4. BMS I/O Panel (Modbus/BACnet)                                   */
/* ================================================================== */

export function bmsIoPanel(): Circuit {
  // Control power: 230V AC → SMPS → 24V DC bus
  const src = comp('power_source', 100, 60, { label: 'Control Supply' });
  const fuse = comp('mcb', 100, 180, {
    label: 'F1',
    state: 'on',
    props: { ratingAmps: 6, tripCurve: 'C' },
  });
  const smps = comp('smps', 100, 320, {
    label: 'SMPS 24V',
    props: { voltage: 24 },
  });

  // 24V DC bus junctions
  const jDcPlus = comp('junction', 300, 294);
  const jDcMinus = comp('junction', 300, 346);

  // BMS I/O modules
  const diMod = comp('di_module', 300, 500, { label: 'DI-01' });
  const doMod = comp('do_module', 500, 500, { label: 'DO-01' });
  const aiMod = comp('ai_module', 300, 680, { label: 'AI-01', props: { aiSignalType: '4_20ma' } });

  // Gateway
  const gateway = comp('modbus_tcp_gateway', 500, 680, {
    label: 'MB GW-01',
    props: {
      gatewayIp: '192.168.1.100',
      gatewayPort: 502,
      modbusDefaultSlaveId: 1,
    },
  });

  // Neutral path
  const jN = comp('junction', 220, 92);
  const jN2 = comp('junction', 220, 346);

  const components = [
    src, fuse, smps,
    jDcPlus, jDcMinus,
    diMod, doMod, aiMod, gateway,
    jN, jN2,
  ];
  const wires: Wire[] = [
    // AC supply → fuse → SMPS
    link(src, 'L_OUT', fuse, '1'),
    link(fuse, '2', smps, 'AC_L'),
    link(src, 'N_OUT', jN, 'T1', 'blue'),
    link(jN, 'T2', jN2, 'T1', 'blue'),
    link(jN2, 'T2', smps, 'AC_N', 'blue'),

    // SMPS DC outputs → 24V bus
    link(smps, 'DC_PLUS', jDcPlus, 'T1', 'red'),
    link(smps, 'DC_MINUS', jDcMinus, 'T1', 'blue'),

    // 24V to DI module
    link(jDcPlus, 'T2', diMod, 'PWR_24V', 'red'),
    link(jDcMinus, 'T2', diMod, 'PWR_0V', 'blue'),

    // 24V to DO module
    link(jDcPlus, 'T3', doMod, 'PWR_24V', 'red'),
    link(jDcMinus, 'T3', doMod, 'PWR_0V', 'blue'),

    // 24V to AI module
    link(jDcPlus, 'T4', aiMod, 'PWR_24V', 'red'),
    link(jDcMinus, 'T4', aiMod, 'PWR_0V', 'blue'),
  ];

  return circuit('BMS I/O Panel', components, wires);
}

/* ================================================================== */
/*  5. Simple Lighting Circuit                                         */
/* ================================================================== */

export function simpleLightingCircuit(): Circuit {
  const src = comp('power_source', 200, 60, { label: 'AC Supply' });
  const mcb = comp('mcb', 200, 180, {
    label: 'Q1',
    state: 'on',
    props: { ratingAmps: 10, tripCurve: 'B' },
  });
  const sw = comp('switch', 200, 310, { label: 'S1', state: 'on' });
  const lamp1 = comp('lamp', 120, 450, {
    label: 'L1',
    props: { powerWatts: 60 },
  });
  const lamp2 = comp('lamp', 280, 450, {
    label: 'L2',
    props: { powerWatts: 60 },
  });
  // Junctions for parallel lamps
  const jSplit = comp('junction', 200, 400);
  const jMerge = comp('junction', 200, 520);
  // Neutral
  const jN = comp('junction', 340, 92);
  const jNR = comp('junction', 340, 520);

  const components = [src, mcb, sw, lamp1, lamp2, jSplit, jMerge, jN, jNR];
  const wires: Wire[] = [
    // Live path
    link(src, 'L_OUT', mcb, '1'),
    link(mcb, '2', sw, '1'),
    link(sw, '2', jSplit, 'T1'),
    link(jSplit, 'T2', lamp1, 'T1'),
    link(jSplit, 'T3', lamp2, 'T1'),
    // Neutral merge
    link(lamp1, 'T2', jMerge, 'T1', 'blue'),
    link(lamp2, 'T2', jMerge, 'T2', 'blue'),
    // Neutral return
    link(src, 'N_OUT', jN, 'T1', 'blue'),
    link(jMerge, 'T3', jNR, 'T1', 'blue'),
    link(jNR, 'T2', jN, 'T2', 'blue'),
  ];

  return circuit('Simple Lighting Circuit', components, wires);
}

/* ================================================================== */
/*  6. Star-Delta (Y-Δ) Motor Starter                                    */
/* ================================================================== */

export function starDeltaStarter(): Circuit {
  const src = comp('three_phase_source', 320, 50, { label: '3φ Supply' });
  const mcb = comp('three_phase_mcb', 320, 170, {
    label: 'Q1',
    state: 'on',
    props: { ratingAmps: 25, tripCurve: 'C' },
  });
  const km1 = comp('three_phase_contactor', 320, 290, {
    label: 'KM1',
    state: 'on',
    props: { ratingAmps: 25 },
  });
  const km2 = comp('three_phase_contactor', 160, 410, {
    label: 'KM2',
    state: 'off',
    props: { ratingAmps: 25 },
  });
  const km3 = comp('three_phase_contactor', 480, 410, {
    label: 'KM3',
    state: 'off',
    props: { ratingAmps: 25 },
  });
  const motor = comp('three_phase_motor', 320, 530, {
    label: 'M1',
    props: {
      powerWatts: 7500,
      powerFactor: 0.85,
      lineVoltage: 400,
      ratedLineAmps: 14,
    },
  });
  const timer = comp('timer', 320, 660, {
    label: 'KT1',
    state: 'off',
    props: { timerDelayMs: 5000 },
  });
  const pb = comp('push_button', 120, 660, {
    label: 'SB1',
    state: 'off',
    props: { buttonType: 'NO' },
  });
  const jStar = comp('junction', 320, 450);
  const j1 = comp('junction', 260, 360);
  const j2 = comp('junction', 320, 360);
  const j3 = comp('junction', 380, 360);
  const jN = comp('junction', 500, 82);
  const jN2 = comp('junction', 500, 552);

  const components = [
    src, mcb, km1, km2, km3, motor, timer, pb,
    jStar, j1, j2, j3, jN, jN2,
  ];
  const wires: Wire[] = [
    // Incoming phases → Q1 → line contactor KM1
    link(src, 'L1_OUT', mcb, '1', 'brown'),
    link(src, 'L2_OUT', mcb, '3', 'black'),
    link(src, 'L3_OUT', mcb, '5', 'grey'),
    link(mcb, '2', km1, 'T1', 'brown'),
    link(mcb, '4', km1, 'T3', 'black'),
    link(mcb, '6', km1, 'T5', 'grey'),
    // KM1 → phase junctions → motor
    link(km1, 'T2', j1, 'T1', 'brown'),
    link(km1, 'T4', j2, 'T1', 'black'),
    link(km1, 'T6', j3, 'T1', 'grey'),
    link(j1, 'T2', motor, 'L1', 'brown'),
    link(j2, 'T2', motor, 'L2', 'black'),
    link(j3, 'T2', motor, 'L3', 'grey'),
    // KM2 star: tie phase ends to star point
    link(km2, 'T1', jStar, 'T1', 'brown'),
    link(km2, 'T2', j1, 'T3', 'brown'),
    link(km2, 'T3', jStar, 'T1', 'black'),
    link(km2, 'T4', j2, 'T3', 'black'),
    link(km2, 'T5', jStar, 'T1', 'grey'),
    link(km2, 'T6', j3, 'T3', 'grey'),
    // KM3 delta: line-to-line reconnection
    link(km3, 'T1', j1, 'T4', 'brown'),
    link(km3, 'T2', j2, 'T4', 'black'),
    link(km3, 'T3', j3, 'T4', 'grey'),
    link(km3, 'T4', j2, 'T5', 'black'),
    link(km3, 'T5', j3, 'T5', 'grey'),
    link(km3, 'T6', j1, 'T5', 'brown'),
    // Control: start → KM1 hold → timer → KM2 (star) / KM3 (delta)
    link(mcb, '2', pb, '1', 'red'),
    link(pb, '2', km1, 'A1', 'red'),
    link(km1, 'A2', jN, 'T1', 'blue'),
    link(km1, '13', pb, '1', 'red'),
    link(km1, '14', km1, 'A1', 'red'),
    link(km1, '13', timer, 'A1', 'red'),
    link(timer, 'A2', jN, 'T2', 'blue'),
    link(timer, 'NC', km2, 'A1', 'red'),
    link(km2, 'A2', jN, 'T3', 'blue'),
    link(timer, 'NO', km3, 'A1', 'red'),
    link(km3, 'A2', jN, 'T4', 'blue'),
    // Neutral
    link(src, 'N_OUT', jN, 'T1', 'blue'),
    link(motor, 'N', jN2, 'T1', 'blue'),
    link(jN2, 'T2', jN, 'T5', 'blue'),
  ];

  return circuit('Star-Delta Motor Starter', components, wires);
}

/* ================================================================== */
/*  7. VFD Feeder                                                      */
/* ================================================================== */

export function vfdFeeder(): Circuit {
  const src = comp('three_phase_source', 300, 60, { label: '3φ Supply' });
  const mcb = comp('three_phase_mcb', 300, 200, {
    label: 'Q1',
    state: 'on',
    props: { ratingAmps: 32, tripCurve: 'C' },
  });
  const contactor = comp('three_phase_contactor', 300, 340, {
    label: 'KM1',
    state: 'off',
    props: { ratingAmps: 32 },
  });
  const motor = comp('three_phase_motor', 300, 500, {
    label: 'M1',
    props: {
      powerWatts: 11000,
      powerFactor: 0.92,
      lineVoltage: 400,
      ratedLineAmps: 22,
      motorDrive: 'vfd',
      thdPercent: 38,
    },
  });
  const jN = comp('junction', 420, 92);
  const jN2 = comp('junction', 420, 522);

  const components = [src, mcb, contactor, motor, jN, jN2];
  const wires: Wire[] = [
    link(src, 'L1_OUT', mcb, '1', 'brown'),
    link(mcb, '2', contactor, 'T1', 'brown'),
    link(contactor, 'T2', motor, 'L1', 'brown'),
    link(src, 'L2_OUT', mcb, '3', 'black'),
    link(mcb, '4', contactor, 'T3', 'black'),
    link(contactor, 'T4', motor, 'L2', 'black'),
    link(src, 'L3_OUT', mcb, '5', 'grey'),
    link(mcb, '6', contactor, 'T5', 'grey'),
    link(contactor, 'T6', motor, 'L3', 'grey'),
    link(mcb, '2', contactor, 'A1', 'red'),
    link(contactor, 'A2', jN, 'T1', 'blue'),
    link(src, 'N_OUT', jN, 'T1', 'blue'),
    link(motor, 'N', jN2, 'T1', 'blue'),
    link(jN2, 'T2', jN, 'T2', 'blue'),
  ];

  return circuit('VFD Feeder', components, wires);
}

/* ================================================================== */
/*  8. Automatic Transfer Switch (ATS)                                 */
/* ================================================================== */

export function atsTransfer(): Circuit {
  const mains = comp('three_phase_source', 120, 100, { label: 'Mains' });
  const gen = comp('three_phase_source', 120, 380, {
    label: 'Generator',
    props: { lineVoltage: 400 },
  });
  const kmMain = comp('three_phase_contactor', 280, 100, {
    label: 'KM-M',
    state: 'on',
    props: { ratingAmps: 63 },
  });
  const kmGen = comp('three_phase_contactor', 280, 380, {
    label: 'KM-G',
    state: 'off',
    props: { ratingAmps: 63 },
  });
  const busL1 = comp('busbar_system', 440, 140, {
    label: 'L1 Bus',
    props: { busbarLeftCount: 2, busbarRightCount: 1 },
  });
  const busL2 = comp('busbar_system', 440, 180, {
    label: 'L2 Bus',
    props: { busbarLeftCount: 2, busbarRightCount: 1 },
  });
  const busL3 = comp('busbar_system', 440, 220, {
    label: 'L3 Bus',
    props: { busbarLeftCount: 2, busbarRightCount: 1 },
  });
  const motor = comp('three_phase_motor', 440, 340, {
    label: 'M1 - Load',
    props: {
      powerWatts: 15000,
      powerFactor: 0.85,
      lineVoltage: 400,
      ratedLineAmps: 28,
    },
  });
  const selector = comp('selector_switch', 280, 520, {
    label: 'S1',
    state: 'on',
    props: {
      selectorPosition: 'AUTO',
      atsController: true,
      atsUtilitySourceLabel: 'Mains',
      atsGenSourceLabel: 'Generator',
      atsUtilityContactorLabel: 'KM-M',
      atsGenContactorLabel: 'KM-G',
      atsTransition: 'open',
      atsUtilityFailAtMs: 2000,
      atsUtilityRestoreAtMs: 15000,
    },
  });
  const lampMains = comp('indicator_lamp', 120, 240, { label: 'H-M' });
  const lampGen = comp('indicator_lamp', 120, 520, { label: 'H-G' });
  const interlock = comp('mechanical_interlock', 200, 520, { label: 'IL1' });
  const jN = comp('junction', 560, 112);
  const jNM = comp('junction', 560, 362);
  const jNC = comp('junction', 200, 600);

  const components = [
    mains, gen, kmMain, kmGen, busL1, busL2, busL3, motor,
    selector, lampMains, lampGen, interlock, jN, jNM, jNC,
  ];
  const wires: Wire[] = [
    // Mains → KM-M → busbars
    link(mains, 'L1_OUT', kmMain, 'T1', 'brown', 25),
    link(mains, 'L2_OUT', kmMain, 'T3', 'black', 25),
    link(mains, 'L3_OUT', kmMain, 'T5', 'grey', 25),
    link(kmMain, 'T2', busL1, 'TAP_L1', 'brown', 25),
    link(kmMain, 'T4', busL2, 'TAP_L1', 'black', 25),
    link(kmMain, 'T6', busL3, 'TAP_L1', 'grey', 25),
    // Generator → KM-G → busbars
    link(gen, 'L1_OUT', kmGen, 'T1', 'brown', 25),
    link(gen, 'L2_OUT', kmGen, 'T3', 'black', 25),
    link(gen, 'L3_OUT', kmGen, 'T5', 'grey', 25),
    link(kmGen, 'T2', busL1, 'TAP_L2', 'brown', 25),
    link(kmGen, 'T4', busL2, 'TAP_L2', 'black', 25),
    link(kmGen, 'T6', busL3, 'TAP_L2', 'grey', 25),
    // Busbars → load
    link(busL1, 'TAP_R1', motor, 'L1', 'brown'),
    link(busL2, 'TAP_R1', motor, 'L2', 'black'),
    link(busL3, 'TAP_R1', motor, 'L3', 'grey'),
    // Mains / gen present lamps
    link(mains, 'L1_OUT', lampMains, 'L', 'red'),
    link(lampMains, 'N', jN, 'T1', 'blue'),
    link(gen, 'L1_OUT', lampGen, 'L', 'red'),
    link(lampGen, 'N', jNC, 'T1', 'blue'),
    // Control: selector AUTO branch → interlock → KM coils
    link(mains, 'L1_OUT', selector, 'COM', 'red'),
    link(selector, 'AUTO', interlock, '1', 'red'),
    link(interlock, '2', kmMain, 'A1', 'red'),
    link(kmMain, 'A2', jNC, 'T2', 'blue'),
    link(selector, 'MAN', kmGen, 'A1', 'red'),
    link(kmGen, 'A2', jNC, 'T3', 'blue'),
    // Neutral returns
    link(mains, 'N_OUT', jN, 'T2', 'blue', 25),
    link(gen, 'N_OUT', jNC, 'T4', 'blue', 25),
    link(motor, 'N', jNM, 'T1', 'blue'),
    link(jNM, 'T2', jN, 'T3', 'blue', 25),
    link(jN, 'T4', jNC, 'T5', 'blue', 25),
  ];

  return circuit('ATS Transfer Panel', components, wires);
}

/* ================================================================== */
/*  9. DC UPS & Battery Backup                                         */
/* ================================================================== */

export function dcUpsBackup(): Circuit {
  const mains = comp('power_source', 80, 60, {
    label: 'AC Mains',
    state: 'off',
  });
  const mcb = comp('mcb', 80, 180, {
    label: 'F1',
    state: 'on',
    props: { ratingAmps: 16, tripCurve: 'C' },
  });
  const ups = comp('ups_module', 280, 180, {
    label: 'UPS-1',
    state: 'on',
    props: { ratingAmps: 10, upsInverterEnabled: true },
  });
  const battery = comp('dc_battery_backup', 280, 360, {
    label: 'BAT-24V',
    state: 'on',
    props: { voltage: 24, batteryCapacityAh: 12 },
  });
  const load = comp('lamp', 480, 180, {
    label: 'Critical Load',
    props: { powerWatts: 60 },
  });
  const jN = comp('junction', 200, 92);

  const components = [mains, mcb, ups, battery, load, jN];
  const wires: Wire[] = [
    link(mains, 'L_OUT', mcb, '1'),
    link(mcb, '2', ups, 'AC_IN_L'),
    link(mains, 'N_OUT', jN, 'T1', 'blue'),
    link(jN, 'T2', ups, 'AC_IN_N', 'blue'),
    link(ups, 'AC_OUT_L', load, 'T1'),
    link(ups, 'AC_OUT_N', load, 'T2', 'blue'),
    link(battery, 'BAT_POS', ups, 'BAT_POS', 'red'),
    link(battery, 'BAT_NEG', ups, 'BAT_NEG', 'black'),
  ];

  return circuit('DC UPS Backup', components, wires);
}

/* ================================================================== */
/*  Export catalogue                                                    */
/* ================================================================== */

export interface ExampleCircuitEntry {
  name: string;
  description: string;
  category: 'Power' | 'Motor Control' | 'BMS' | 'Lighting';
  build: () => Circuit;
}

export const EXAMPLE_CIRCUITS: ExampleCircuitEntry[] = [
  {
    name: 'Simple Lighting Circuit',
    description: 'AC source → MCB → switch → two parallel lamps. Basic single-phase wiring.',
    category: 'Lighting',
    build: simpleLightingCircuit,
  },
  {
    name: 'DOL Motor Starter',
    description: 'Single-phase direct-on-line: MCB → contactor → overload relay → motor.',
    category: 'Motor Control',
    build: dolMotorStarter,
  },
  {
    name: '3-Phase Motor Starter',
    description: '3φ supply → 3P MCB → 3P contactor → three-phase motor (5.5 kW).',
    category: 'Motor Control',
    build: threePhaseMotorStarter,
  },
  {
    name: 'Star-Delta Motor Starter',
    description: 'Y-Δ starter: KM1 line, KM2 star, KM3 delta, timer changeover, 7.5 kW motor.',
    category: 'Motor Control',
    build: starDeltaStarter,
  },
  {
    name: 'VFD Feeder',
    description: '3φ supply → MCB → isolator contactor → VFD-driven motor (11 kW, elevated THD).',
    category: 'Motor Control',
    build: vfdFeeder,
  },
  {
    name: 'ATS Transfer Panel',
    description: 'Dual-source ATS: mains + generator contactors, busbars, load, selector & indication.',
    category: 'Power',
    build: atsTransfer,
  },
  {
    name: 'ACB Incomer with BMS',
    description: 'Air circuit breaker incomer (630A, BMS-enabled) feeding two motor feeders via busbar.',
    category: 'Power',
    build: acbIncomerBms,
  },
  {
    name: 'BMS I/O Panel',
    description: 'Control power SMPS → 24V DC bus → DI, DO, AI modules + Modbus TCP gateway.',
    category: 'BMS',
    build: bmsIoPanel,
  },
  {
    name: 'DC UPS Backup',
    description:
      'UPS with 24 V battery string: inverter feeds critical AC load when mains (F1 path) is off.',
    category: 'Power',
    build: dcUpsBackup,
  },
];
