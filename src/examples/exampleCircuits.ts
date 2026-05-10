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

function link(
  from: CircuitComponent,
  fromLabel: string,
  to: CircuitComponent,
  toLabel: string,
  color: WireColor = 'brown',
  crossSection = 2.5
): Wire {
  const fp = from.connectionPoints.find((p) => p.label === fromLabel);
  const tp = to.connectionPoints.find((p) => p.label === toLabel);
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
  const busbar = comp('busbar_system', 300, 380, { label: 'Main Busbar' });
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

  const components = [src, acb, busbar, mcb1, mcb2, motor1, motor2, jN, jNM1, jNM2, jNBar];
  const wires: Wire[] = [
    // Source → ACB (L1–L3 through 4P ACB, poles 1-6 = L1-L3)
    link(src, 'L1_OUT', acb, '1', 'brown', 95),
    link(src, 'L2_OUT', acb, '3', 'black', 95),
    link(src, 'L3_OUT', acb, '5', 'grey', 95),
    // ACB → Busbar
    link(acb, '2', busbar, 'TAP_1', 'brown', 95),
    link(acb, '4', busbar, 'TAP_2', 'black', 95),
    link(acb, '6', busbar, 'TAP_3', 'grey', 95),
    // Busbar → Q1 (Feeder 1)
    link(busbar, 'TAP_4', mcb1, '1', 'brown'),
    link(busbar, 'TAP_5', mcb1, '3', 'black'),
    link(busbar, 'TAP_6', mcb1, '5', 'grey'),
    // Q1 → Motor 1
    link(mcb1, '2', motor1, 'L1', 'brown'),
    link(mcb1, '4', motor1, 'L2', 'black'),
    link(mcb1, '6', motor1, 'L3', 'grey'),
    // Busbar → Q2 (Feeder 2) — reuse TAP 4-6 via separate connections
    link(busbar, 'TAP_4', mcb2, '1', 'brown'),
    link(busbar, 'TAP_5', mcb2, '3', 'black'),
    link(busbar, 'TAP_6', mcb2, '5', 'grey'),
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
];
