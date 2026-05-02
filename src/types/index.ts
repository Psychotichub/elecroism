export type ComponentType =
  | 'switch'
  /** Single-pole two-way (SPDT): COM, T1, T2 — maintained throw for stair/changeover wiring. */
  | 'two_way_switch'
  | 'socket'
  | 'mcb'
  | 'hrc_fuse'
  | 'control_circuit_fuse'
  | 'earth_leakage_relay_cbct'
  | 'rcd'
  | 'residual_current_circuit_breaker'
  | 'lamp'
  | 'motor'
  | 'heater'
  | 'panel_heater'
  | 'cooling_fan'
  | 'busbar'
  | 'busbar_system'
  | 'neutral_bar_system'
  | 'earth_bar_grounding_system'
  | 'terminal_block'
  | 'wire'
  | 'power_source'
  /** Adjustable nominal DC supply (+ / −). */
  | 'dc_power_source'
  /** AC mains → DC bus (rectifier / PSU): AC_L/AC_N → DC_PLUS/DC_MINUS, output V adjustable. */
  | 'ac_dc_converter'
  /** Isolating control transformer: primary AC to reduced secondary AC. */
  | 'control_transformer'
  | 'junction'
  | 'push_button'
  | 'generic_load'
  | 'contactor'
  | 'relay'
  | 'smart_relay'
  | 'timer'
  | 'overload_relay'
  | 'three_phase_source'
  | 'three_phase_motor'
  | 'three_phase_mcb'
  | 'mccb'
  | 'motor_protection_circuit_breaker'
  | 'four_phase_mcb'
  | 'air_circuit_breaker'
  /** 3P MCCB with motor operator + BMS control terminals (MOT / shunt / aux / trip). */
  | 'motorized_mccb'
  /** 4P (L1–L3 + N) motorized MCCB + same BMS control block as 3P mMCCB. */
  | 'four_pole_motorized_mccb'
  | 'three_phase_contactor'
  | 'four_phase_contactor'
  /** Latched safety mushroom-head NC button (twist-to-release). */
  | 'estop'
  /** 3-position rotary selector (AUTO / OFF / MANUAL). */
  | 'selector_switch'
  /** Panel-front colored indicator (L1/L2/L3 lamp). */
  | 'indicator_lamp'
  | 'phase_indicator_bank'
  /** Switch-mode power supply: AC mains \u2192 DC bus (24/12/48 V typ.). */
  | 'smps'
  /** Small DC-coil interface relay used between BMS DOs and main coils. */
  | 'interposing_relay'
  | 'aux_contact_block'
  /** 3\u03c6 multifunction meter (V / A / kW / kWh + Modbus tag). */
  | 'energy_meter'
  | 'digital_multifunction_meter'
  | 'multimeter'
  /** Guarded switch operated by panel-door position (closed door = contact closed). */
  | 'door_interlock'
  | 'mechanical_interlock'
  /** Ethernet gateway for Modbus TCP supervisory integration. */
  | 'modbus_tcp_gateway'
  /** Serial Modbus RTU (RS485) communication module. */
  | 'modbus_rtu_module'
  /** Ethernet gateway for BACnet/IP supervisory integration. */
  | 'bacnet_ip_gateway'
  /** BMS digital input module. */
  | 'di_module'
  /** BMS digital output module. */
  | 'do_module'
  /** BMS analog input module. */
  | 'ai_module'
  /** BMS analog output module. */
  | 'ao_module'
  /** Relay interface card (field isolation / fan-out). */
  | 'relay_interface_card'
  /** Serial/Ethernet protocol converter (RS232/485/Ethernet). */
  | 'communication_converter'
  /** IoT edge gateway for cloud telemetry uplink. */
  | 'iot_gateway'
  /** Cloud monitoring module for remote dashboards/alerts. */
  | 'cloud_monitoring_module'
  /** Supervisory energy management controller. */
  | 'energy_management_controller'
  /** Industrial Ethernet switch for BMS network fan-out. */
  | 'ethernet_switch'
  /** Analog signal isolator module. */
  | 'signal_isolator'
  /** Optocoupler-based digital isolation module. */
  | 'optocoupler_module'
  | 'ups_module'
  | 'dc_battery_backup'
  | 'motor_operator_kit'
  | 'shunt_trip_coil'
  | 'closing_coil'
  | 'uvr_release'
  | 'key_interlock'
  | 'neutral_link'
  | 'earth_link'
  | 'current_transformer'
  | 'voltage_transformer'
  | 'din_rail'
  | 'mounting_plate'
  | 'cable_duct'
  | 'busbar_support_insulator'
  | 'ferrule_cable_markers'
  | 'control_wiring'
  | 'power_cables'
  | 'ms_gi_sheet_enclosure'
  | 'ip_rated_enclosure'
  | 'power_quality_analyzer';

export type ComponentState = 'on' | 'off' | 'tripped' | 'fault';

export type WireColor =
  | 'brown'
  | 'blue'
  | 'green_yellow'
  | 'black'
  | 'grey'
  | 'red'
  | 'ethernet';

/**
 * Layer-like drawing style for wires (documentation / readability).
 * Distinct from `wireCategory` (power/control/comm) used with the engine.
 */
export type WireStyleLayer =
  | 'power_ac'
  | 'power_dc'
  | 'control_ac'
  | 'control_dc'
  | 'earth_pe'
  | 'neutral'
  | 'communication'
  | 'instrumentation_analog';

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
  hrcType?: 'gG' | 'gL' | 'aM' | 'aR' | 'gR';
  hrcBreakingCapacityKa?: number;
  hrcFusingFactor?: number;
  hrcI2tA2s?: number;
  controlCircuitSupplyMode?:
    | 'single_phase_ln'
    | 'derived_from_3ph_ll'
    | 'monitoring_3ph';
  controlCircuitVoltage?: 24 | 110 | 230;
  elrTripDelayMs?: number;
  mpcbTripClass?: '10A' | '10' | '20' | '30';
  rcdSensitivity?: 10 | 30 | 100 | 300;
  rcdType?: 'AC' | 'A' | 'B';
  rcdTripTimeMs?: number;
  earthLeakageTripMa?: 30 | 100 | 300 | 500;

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

  /** Optional conductor size hint on some devices (mm²). */
  crossSection?: number;
  wireColor?: WireColor;

  phaseSystem?: PhaseSystem;
  phaseVoltage?: number;
  lineVoltage?: number;
  /** Three-phase motor: nameplate line current for overload (A); optional */
  ratedLineAmps?: number;
  /**
   * Optional per-phase line-current multipliers (wye, currents aligned to ABC
   * voltages). Normalized so mean(f) = 1 keeps the same balanced I_line from
   * P/(√3·U_LL·PF); neutral I_N is computed from the phasor sum.
   */
  threePhaseCurrentFactorL1?: number;
  threePhaseCurrentFactorL2?: number;
  threePhaseCurrentFactorL3?: number;
  /** Optional per-phase power factor (0.05–1); defaults to main powerFactor. */
  threePhasePowerFactorL1?: number;
  threePhasePowerFactorL2?: number;
  threePhasePowerFactorL3?: number;
  /**
   * Optional L–N voltage multipliers (mean 1). L–L values are derived from the
   * three phase-to-neutral phasors separated by 120°.
   */
  threePhaseVoltageFactorL1?: number;
  threePhaseVoltageFactorL2?: number;
  threePhaseVoltageFactorL3?: number;
  /**
   * Optional real power per phase (W) for 4-wire wye modeling. When any value
   * is set and the sum is greater than 0, line currents use P_k/(U_L-N,k·PF_k) instead
   * of splitting total `powerWatts` equally (current magnitude factors are ignored).
   */
  powerWattsL1?: number;
  powerWattsL2?: number;
  powerWattsL3?: number;

  buttonType?: 'NO' | 'NC';

  /** 3-position rotary selector position for `selector_switch`. */
  selectorPosition?: 'OFF' | 'AUTO' | 'MANUAL';

  /** Indicator lamp colour (panel-front L1/L2/L3 light). */
  indicatorColor?: 'red' | 'green' | 'amber' | 'blue' | 'white';
  /** Indicator lamp phase tag (visual label only, e.g. "L1"). */
  indicatorPhaseTag?: 'L' | 'L1' | 'L2' | 'L3' | 'N' | 'PE' | 'AUX';
  /** Indicator lamp wiring family to accept for energization. */
  indicatorSupplyType?: 'ac' | 'dc';
  /** Timer relay ON-delay before IN↔OUT closes after coil energizes. */
  timerDelayMs?: number;

  /**
   * `aux_contact_block` only: when set to another component id (contactor,
   * relay, timer, …), NO 13–14 / NC 21–22 follow that device’s coil pickup in
   * simulation instead of the block’s manual on/off (seal-in / interlocks).
   */
  auxContactFollowContactorId?: string;

  /** Interposing-relay coil voltage label (V) — 24 V DC typical for BMS DOs. */
  relayCoilVoltage?: number;
  /** Coil supply for interposing relay (panel schedule label). */
  relayCoilSupply?: '24dc' | '110dc' | '230ac';

  /** SMPS / energy-meter shared field-bus communication protocol tag. */
  meterProtocol?: 'none' | 'modbus_rtu' | 'modbus_tcp' | 'bacnet_ip';
  /** CT primary rating (A) for energy meter — documentation only. */
  meterCtPrimary?: number;
  /** Modbus / BACnet address for energy meter. */
  meterCommAddress?: number;
  /** Whether the energy-meter symbol shows a kWh accumulator on the face. */
  meterShowKwh?: boolean;
  multimeterMode?: 'voltage' | 'current' | 'continuity';
  multimeterSignal?: 'auto' | 'ac' | 'dc';
  multimeterHighVoltage?: boolean;
  multimeterMaxVoltage?: number;
  multimeterComTargetComponentId?: string;
  multimeterComTargetPointId?: string;
  multimeterInputTargetComponentId?: string;
  multimeterInputTargetPointId?: string;
  multimeterComProbeX?: number;
  multimeterComProbeY?: number;
  multimeterInputProbeX?: number;
  multimeterInputProbeY?: number;
  /** Communication endpoint settings for gateway-type components. */
  gatewayIp?: string;
  gatewaySubnet?: string;
  gatewayDefaultRoute?: string;
  gatewayPort?: number;
  serialBaudRate?: 9600 | 19200 | 38400 | 57600 | 115200;
  serialParity?: 'none' | 'even' | 'odd';
  serialStopBits?: 1 | 2;
  serialDataBits?: 7 | 8;
  modbusDefaultSlaveId?: number;
  commConverterMode?:
    | 'rs232_to_rs485'
    | 'rs485_to_ethernet'
    | 'modbus_rtu_to_modbus_tcp'
    | 'bacnet_mstp_to_bacnet_ip';
  bacnetDeviceInstance?: number;
  bacnetBbmdEnabled?: boolean;
  bacnetBbmdIp?: string;
  mstpMacAddress?: number;
  mstpMaxMaster?: number;
  ioChannels?: number;
  aiSignalType?: '0_10v' | '4_20ma';
  aoSignalType?: '0_10v' | '4_20ma';

  color?: string;
  fontSize?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelFontSize?: number;
}

/** Merged into `ComponentProperties` (declaration merge) for AC→DC converter faceplate fields. */
export interface ComponentProperties {
  /** Timer relay ON-delay before IN↔OUT closes after coil energizes. */
  timerDelayMs?: number;
  /** AC–DC converter: nominal AC input (Vrms) — faceplate / documentation. */
  acDcInputVoltageV?: number;
  /** AC–DC converter: mains frequency (display). */
  acDcMainsFrequencyHz?: 50 | 60;
  /** AC–DC converter: include optional isolation/step-down transformer stage. */
  acDcHasTransformer?: boolean;
  /** AC–DC converter: diode rectifier topology (educational / faceplate). */
  acDcRectifierType?: 'half_wave' | 'full_wave' | 'bridge';
  /** AC–DC converter: output regulation stage (linear regulator after filter). */
  acDcHasRegulator?: boolean;
}

/** Per-target object snap while drawing wires (AutoCAD-style osnap modes). */
export interface WireObjectSnapModes {
  /** Component terminals / connection points */
  connection: boolean;
  /** Existing wire polyline vertices */
  endpoint: boolean;
  /** Midpoints of orthogonal wire segments */
  midpoint: boolean;
  /** Crossing of a horizontal and a vertical wire segment */
  intersection: boolean;
}

export const DEFAULT_WIRE_OBJECT_SNAP_MODES: WireObjectSnapModes = {
  connection: true,
  endpoint: true,
  midpoint: true,
  intersection: true,
};

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPointId: string;
  toComponentId: string;
  toPointId: string;
  points: number[];
  color: WireColor;
  /** Logical category for filtering/validation (power/control/communication). */
  wireCategory?: 'power' | 'control' | 'comm';
  /** Optional protocol tag for communication links. */
  wireProtocol?: 'none' | 'ethernet' | 'modbus_tcp' | 'bacnet_ip' | 'other';
  crossSection: number;
  energized: boolean;
  currentAmps: number;
  /** Auto-generated designator (e.g. W1, W2, or `Q0.L1-Q1.L1` when `wireNumberAuto`). */
  wireNumber?: string;
  /**
   * When true, `wireNumber` is derived from `{fromLabel}.{fromTerminal}-{toLabel}.{toTerminal}`
   * and kept in sync when those labels change. When false/omitted, `wireNumber` is manual / legacy `Wn`.
   */
  wireNumberAuto?: boolean;
  /** Manual label shown on drawing; overrides `wireNumber` when set. */
  wireLabel?: string;
  /** When false, this wire’s label is hidden (global toggle still applies). */
  labelVisible?: boolean;
  /** Optional documentation / schedule fields. */
  sourceTag?: string;
  destinationTag?: string;
  /** Layer-like stroke preset (color, width, dash). When set, overrides plain conductor look. */
  styleLayer?: WireStyleLayer;
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
  /**
   * Warn in validation when 3φ motor per-phase load imbalance (power or
   * current factors) exceeds this percent of the mean. Default 15.
   */
  phaseImbalanceWarningPercent?: number;
  /** Master toggle for wire designator / label overlays. Default true. */
  wireLabelsVisible?: boolean;
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
  /** Meter-specific detected signal type for display hints. */
  meterSignal?: 'ac' | 'dc';
  /**
   * Balanced three-phase model: equal line currents, neutral ≈ 0.
   * Populated for 3φ sources, contactors, meters, breakers, and balanced 3φ loads.
   */
  currentL1A?: number;
  currentL2A?: number;
  currentL3A?: number;
  /** Neutral conductor RMS (A); ~0 when phases are balanced in the model */
  currentNeutralA?: number;
  /** RMS phase-to-neutral (V), wye */
  voltageL1NV?: number;
  voltageL2NV?: number;
  voltageL3NV?: number;
  /** RMS line-to-line (V) */
  voltageL1L2V?: number;
  voltageL2L3V?: number;
  voltageL3L1V?: number;
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

/** One BMS command attempt for the BMS simulator / audit log. */
export interface BmsSimLogEntry {
  id: string;
  deviceId: string;
  label: string;
  deviceKind: 'ACB' | 'mMCCB';
  command: string;
  ok: boolean;
  detail: string;
  ts: number;
}

export interface HistoryEntry {
  circuit: Circuit;
  description: string;
  /** BMS simulator log at this revision (restored with undo/redo). */
  bmsSimLog: BmsSimLogEntry[];
}
