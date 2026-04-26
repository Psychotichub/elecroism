export type ComponentType =
  | 'switch'
  | 'socket'
  | 'mcb'
  | 'rcd'
  | 'lamp'
  | 'motor'
  | 'heater'
  | 'busbar'
  | 'wire'
  | 'power_source'
  /** Adjustable nominal DC supply (+ / −). */
  | 'dc_power_source'
  | 'junction'
  | 'push_button'
  | 'generic_load'
  | 'contactor'
  | 'relay'
  | 'timer'
  | 'overload_relay'
  | 'three_phase_source'
  | 'three_phase_motor'
  | 'three_phase_mcb'
  | 'four_phase_mcb'
  | 'air_circuit_breaker'
  /** 3P MCCB with motor operator + BMS control terminals (MOT / shunt / aux / trip). */
  | 'motorized_mccb'
  /** 4P (L1–L3 + N) motorized MCCB + same BMS control block as 3P mMCCB. */
  | 'four_pole_motorized_mccb'
  | 'three_phase_contactor'
  | 'four_phase_contactor';

export type ComponentState = 'on' | 'off' | 'tripped' | 'fault';

export type WireColor = 'brown' | 'blue' | 'green_yellow' | 'black' | 'grey' | 'red';

export type PhaseSystem = 'single_phase' | 'three_phase';

export interface ConnectionPoint {
  id: string;
  componentId: string;
  x: number;
  y: number;
  label: string;
}

/** Persisted dynamic state for `air_circuit_breaker` (thermal integral, definite delays). */
export interface AcbSimState {
  lastWallMs?: number;
  /** Integrated overload severity: ∑ max(0,(I/Ir)²−1)·dt */
  thermalExcess?: number;
  /** Wall time when branch current entered the short-time band */
  stZoneSinceMs?: number | null;
  /** Wall time when earth-fault band was entered */
  earthZoneSinceMs?: number | null;
  /** Instantaneous trip scheduled at this wall time (current-zero / arc model) */
  instantTripAtMs?: number | null;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  /** Uniform visual scale (connection points and graphics); default 1 */
  scale?: number;
  rotation: number;
  state: ComponentState;
  /** Momentary contact: only for `push_button`; true while pointer is down */
  pressed?: boolean;
  selected: boolean;
  connectionPoints: ConnectionPoint[];
  properties: ComponentProperties;
  /** Runtime integration for ACB time-current behaviour (cloned with circuit on simulate) */
  acbSimState?: AcbSimState;
}

export interface ComponentProperties {
  switchType?: 'SPST' | 'SPDT' | 'DPST' | 'DPDT';
  poles?: number;

  ratingAmps?: number;
  tripCurve?: 'B' | 'C' | 'D';
  breakingCapacity?: 6000 | 10000;
  rcdSensitivity?: 10 | 30 | 100 | 300;

  /** Air circuit breaker: instantaneous pickup as multiple of Ir (e.g. 10) */
  acbInstantaneousMult?: number;
  /** ACB short-time pickup as multiple of Ir (below instantaneous mult) */
  acbShortTimeMult?: number;
  acbEarthFaultEnabled?: boolean;
  /** ACB earth-fault trip (A), when enabled and on L–N fault path */
  acbEarthFaultAmps?: number;
  /** Supply frequency for half-cycle (current-zero) delay (Hz) */
  acbLineFrequencyHz?: number;
  /** Definite short-time delay after ST pickup (s) */
  acbShortTimeDelayS?: number;
  /** Definite earth-fault delay after Ig pickup (s) */
  acbEarthFaultDelayS?: number;
  /** Trip long-time overload when thermal excess integral exceeds this */
  acbThermalTripIntegral?: number;

  /** BMS / motor pack: remote close (CC), open (shunt), UVR, spring, optional comms */
  acbBmsEnabled?: boolean;
  /** UVR coil energized — if false while BMS enabled, contacts must not close (interlock) */
  acbBmsUvrEnergized?: boolean;
  /** Closing spring charged (CC pulse ineffective if false) */
  acbBmsSpringCharged?: boolean;
  /** Optional field bus label for incomer supervision */
  acbBmsProtocol?: 'none' | 'modbus_rtu' | 'modbus_tcp' | 'bacnet_ip';

  /** Control supply for CC / ST / UVR (panel schedule — not simulated) */
  acbCtrlSupply?: '24dc' | '110dc' | '230ac';
  /** Control-circuit fuse reference on drawings (e.g. F1) */
  acbCtrlFuseDesignation?: string;
  /** Fuse rating (A) — documentation only */
  acbCtrlFuseAmps?: number;
  /** Interposing relay for BMS close → closing coil (CC) */
  acbRelayCcId?: string;
  /** Interposing relay for BMS open → shunt trip */
  acbRelayStId?: string;
  /** BMS DO tag for close command (as-built label) */
  acbBmsDoCloseTag?: string;
  /** BMS DO tag for open / shunt command */
  acbBmsDoOpenTag?: string;
  /** BMS DI tags for aux feedback (documentation) */
  acbBmsDi52aTag?: string;
  acbBmsDi52bTag?: string;
  acbBmsDiTripTag?: string;

  /** Motorized MCCB: remote motor close, shunt trip, aux + trip feedback (as-built / panel schedule). */
  mccbBmsEnabled?: boolean;
  /** Control supply present — if false while BMS enabled, main contacts treated open (interlock). */
  mccbBmsCtrlVoltageOk?: boolean;
  /** Mechanism ready (spring charged / ready) — motor close pulse ignored if false. */
  mccbBmsMotorReady?: boolean;
  mccbBmsProtocol?: 'none' | 'modbus_rtu' | 'modbus_tcp' | 'bacnet_ip';
  mccbCtrlSupply?: '24dc' | '110dc' | '230ac';
  mccbCtrlFuseDesignation?: string;
  mccbCtrlFuseAmps?: number;
  mccbRelayMotorId?: string;
  mccbRelayStId?: string;
  mccbBmsDoMotorTag?: string;
  mccbBmsDoShuntTag?: string;
  mccbBmsDiAuxNoTag?: string;
  mccbBmsDiAuxNcTag?: string;
  mccbBmsDiTripTag?: string;

  socketType?: 'schuko' | 'UK' | 'US' | 'IEC';
  voltage?: number;

  powerWatts?: number;
  loadType?: 'resistive' | 'inductive' | 'capacitive';
  powerFactor?: number;

  crossSection?: 1.5 | 2.5 | 4 | 6 | 10;
  wireColor?: WireColor;

  phaseSystem?: PhaseSystem;
  phaseVoltage?: number;
  lineVoltage?: number;
  /** Three-phase motor: nameplate line current for overload (A); optional */
  ratedLineAmps?: number;

  buttonType?: 'NO' | 'NC';

  color?: string;
  fontSize?: number;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPointId: string;
  toComponentId: string;
  toPointId: string;
  points: number[];
  color: WireColor;
  crossSection: number;
  energized: boolean;
  currentAmps: number;
}

export interface Circuit {
  id: string;
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
  gridSize: number;
  zoom: number;
  panX: number;
  panY: number;
  createdAt: string;
  updatedAt: string;
}

export interface NodeResult {
  nodeId: string;
  voltageV: number;
  currentA: number;
  powerW: number;
  powerVA?: number;
  powerFactor?: number;
  energized: boolean;
  /** Line-to-line RMS (V) for three-phase devices */
  lineVoltageRmsV?: number;
  /** Line current RMS (A) for balanced three-phase loads */
  lineCurrentRmsA?: number;
  /** Per-phase RMS voltage phase-to-neutral (V), wye */
  phaseVoltageRmsV?: number;
}

export interface SimulationResult {
  success: boolean;
  nodes: Record<string, NodeResult>;
  faults: FaultEvent[];
  timestamp: number;
  totalPowerW: number;
  totalCurrentA: number;
}

export interface FaultEvent {
  id: string;
  type: 'overload' | 'short_circuit' | 'earth_fault' | 'arc_fault';
  affectedComponentId: string;
  message: string;
  severity: 'warning' | 'critical';
  timestamp: number;
}

export type ToolMode = 'select' | 'wire' | 'delete' | 'pan';

export interface HistoryEntry {
  circuit: Circuit;
  description: string;
}
