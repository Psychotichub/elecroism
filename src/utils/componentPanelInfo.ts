import type { ComponentType } from '../types';

/** Rich help text shown in the property panel when a component is selected. */
export interface ComponentPanelDescription {
  /** Short human-readable title (not the internal type id). */
  displayName: string;
  /** One or two sentences: what the symbol represents. */
  description: string;
  /** Bullet-style capabilities modeled or editable in this app. */
  features: string[];
  /** When/why to place it on a diagram or study. */
  purpose: string;
}

/** Plain-text block for native `title` tooltips and `aria-label`. */
export function formatComponentPanelHelpText(
  info: ComponentPanelDescription
): string {
  const featureLines = info.features.map((f) => `  • ${f}`);
  return [
    info.displayName,
    '',
    info.description,
    '',
    'Features:',
    ...featureLines,
    '',
    'Purpose:',
    info.purpose,
  ].join('\n');
}

export const COMPONENT_PANEL_DESCRIPTIONS = {
  switch: {
    displayName: 'Switch',
    description:
      'Manual switching device for opening or closing a circuit under normal load.',
    features: [
      'SPST / SPDT / DPST / DPDT pole arrangements',
      'On/off state for continuity in simulation',
      'Label and phase context for load studies',
    ],
    purpose:
      'Use for isolators, local disconnects, or control-path selection in single-line or control diagrams.',
  },
  two_way_switch: {
    displayName: 'Two-way switch (SPDT)',
    description:
      'Single-pole changeover: one common (COM) and two throws (T1, T2). Only one throw is connected at a time — typical for stair lighting or A/B routing.',
    features: [
      'Terminals COM, T1, T2',
      'Maintained position: ON = COM–T1, OFF = COM–T2',
      'Double-click symbol to flip throws',
    ],
    purpose:
      'Model two-way lighting circuits, manual source selection, or any SPDT maintained schematic element.',
  },
  socket: {
    displayName: 'Socket outlet',
    description:
      'Represents a final circuit outlet supplying portable or fixed equipment.',
    features: [
      'Schuko / UK / US / IEC style metadata',
      'Rated as a load connection point in studies',
    ],
    purpose:
      'Model general-purpose outlets, workshop supplies, or plug-in loads on a panel schedule.',
  },
  mcb: {
    displayName: 'Miniature circuit breaker (MCB)',
    description:
      'Overcurrent protective device for final circuits with thermal-magnetic tripping.',
    features: [
      '1P / 2P layouts and trip curve (B/C/D)',
      'Rated current and breaking capacity',
      'Simulation: conducts when closed, trips on overload/short',
    ],
    purpose:
      'Represent branch protection for lighting, sockets, or small machines.',
  },
  hrc_fuse: {
    displayName: 'HRC fuse',
    description:
      'High rupturing capacity fuse for reliable clearance of high fault currents.',
    features: [
      'Fuse type (gG, aM, etc.) and I²t documentation fields',
      'Multi-pole pass-through when fitted as disconnect',
    ],
    purpose:
      'Use on incomers, motor feeders, or where fuse discrimination is shown on the drawing.',
  },
  control_circuit_fuse: {
    displayName: 'Control circuit fuse',
    description:
      'Small fuse protecting control, auxiliary, or signaling circuits.',
    features: ['In/out pass-through when device is closed', 'Documentation rating fields'],
    purpose:
      'Show protection ahead of relays, contactor coils, or PLC inputs in control schematics.',
  },
  earth_leakage_relay_cbct: {
    displayName: 'Earth leakage relay (CBCT)',
    description:
      'Residual earth-fault detection using a core-balance current transformer.',
    features: [
      'Vector residual current on protected zone (L1+L2+L3 or L+N)',
      'Trip delay and sensitivity settings',
      'Conducts main path when healthy and enabled',
    ],
    purpose:
      'Represent ELR + toroid schemes on incomers or motor feeders where earth monitoring is required.',
  },
  rcd: {
    displayName: 'RCD / RCCB',
    description:
      'Residual current device that trips on vector imbalance between line and neutral currents.',
    features: [
      '2P terminals 1–4 or 4P 1–8 (odd in, even out per pole)',
      'Vector residual trip with configurable sensitivity and delay',
      'Sensitivity and type (AC/A/B) metadata',
    ],
    purpose:
      'Model shock protection, fire risk reduction, or TT/TN-S final circuit protection.',
  },
  residual_current_circuit_breaker: {
    displayName: 'Residual current circuit breaker (RCBO-style)',
    description:
      'Combined overcurrent and residual-current protection in one device footprint.',
    features: [
      'Pole-aware 1–4 / 1–8 terminal mapping',
      'RCD parameters plus MCB-style behaviour',
    ],
    purpose:
      'Use where a single-pole device must show both overload and 30 mA (typ.) protection.',
  },
  lamp: {
    displayName: 'Lamp / lighting load',
    description: 'Resistive lighting load for power and voltage drop studies.',
    features: ['Power rating', 'Energization from connected supply'],
    purpose: 'Represent luminaires or pilot loads on a circuit.',
  },
  motor: {
    displayName: 'Motor',
    description:
      'Single- or three-phase motor load with power, efficiency, and power factor.',
    features: [
      'Phase system drives current formula (1φ vs 3φ)',
      'Overload relay association where configured',
    ],
    purpose:
      'Model pumps, fans, compressors, or any rotating machine on the one-line.',
  },
  heater: {
    displayName: 'Heater',
    description: 'Resistive heater load (space or process).',
    features: ['Wattage-based current', 'Works with MCB/fuse protection upstream'],
    purpose: 'Show fixed heating loads on distribution or control heating circuits.',
  },
  panel_heater: {
    displayName: 'Panel heater',
    description: 'Anti-condensation or enclosure heater load.',
    features: ['Rated power', 'Treat as resistive load in simulation'],
    purpose: 'Document HVAC/auxiliary heat inside switchgear or outdoor panels.',
  },
  cooling_fan: {
    displayName: 'Cooling fan',
    description: 'Ventilation fan load for panel or equipment cooling.',
    features: ['Power-based loading', 'Connects like other motorised loads'],
    purpose: 'Represent fan circuits on auxiliary supplies or inverter-fed cooling.',
  },
  busbar: {
    displayName: 'Busbar',
    description: 'Low-impedance conductor tying several feeders to a common point.',
    features: ['All terminals internally commoned in simulation', 'High-level incomer symbol'],
    purpose: 'Use as a simple bus tie or incomer aggregation node.',
  },
  busbar_system: {
    displayName: 'Busbar system',
    description: 'Structured bus representation for multi-way distribution.',
    features: ['Commoned terminals for continuity', 'Scalable to multiple taps'],
    purpose: 'Show main LV bus sections, tap-offs, or switchboard buswork.',
  },
  neutral_bar_system: {
    displayName: 'Neutral bar',
    description: 'Neutral conductor collection and distribution bar.',
    features: ['Common N reference for connected neutrals'],
    purpose: 'Represent TN-C-S / TN-S neutral distribution inside a panel.',
  },
  earth_bar_grounding_system: {
    displayName: 'Earth bar / PE',
    description: 'Protective earth equipotential bonding bar.',
    features: ['Common PE reference for safety earth conductors'],
    purpose: 'Show earthing arrangement and PE homing on drawings.',
  },
  terminal_block: {
    displayName: 'Terminal block',
    description: 'Pass-through or marshalling terminals for field wiring.',
    features: ['IN→OUT bridge when not omitted in special analyses'],
    purpose: 'Break out control wires, marshalling cabinets, or interface points.',
  },
  wire: {
    displayName: 'Wire (schematic)',
    description:
      'Optional schematic-only wire element; most circuits use drawn wire segments instead.',
    features: ['May appear in legacy or imported diagrams'],
    purpose: 'Prefer normal wire tool; use if a wire-like component is required.',
  },
  power_source: {
    displayName: 'AC power source',
    description: 'Ideal or nominal AC supply feeding the network.',
    features: ['Voltage and frequency parameters', 'Defines energization root for studies'],
    purpose: 'Place at incomer, generator, or UPS output to energize downstream devices.',
  },
  dc_power_source: {
    displayName: 'DC power source',
    description: 'Adjustable nominal DC supply (+/−) for control or DC loads.',
    features: ['Voltage setpoint', 'Single-phase context for panel metadata'],
    purpose: 'Model 24 Vdc panels, battery chargers, or DC bus feeds.',
  },
  ac_dc_converter: {
    displayName: 'AC–DC converter (linear model)',
    description:
      'Classical single-phase path: optional mains transformer, diode rectifier (half / full / bridge), capacitor filter, and optional linear regulator — contrasted on-canvas with SMPS.',
    features: [
      'Faceplate stages 1–4 (XFMR → RECT → C → REG) driven from properties',
      'Ideal |sin| envelope sketch for full-wave / bridge education',
      'AC_L / AC_N in, DC_PLUS / DC_MINUS out',
      'Primary AC current coupled to DC bus load (η, PF, rated W)',
      'Output overload trips supply and drops DC bus',
    ],
    purpose:
      'Teach or document rectification before DC loads; use the SMPS component for switch-mode bricks.',
  },
  control_transformer: {
    displayName: 'Control transformer',
    description:
      'Isolating transformer stepping mains down to a safe control voltage (e.g. 230→24 Vac).',
    features: ['Primary/secondary pair bridging when modeled', 'Distinct from VT metering'],
    purpose: 'Represent dedicated control supplies for contactors and relays.',
  },
  junction: {
    displayName: 'Junction',
    description: 'Electrical node where multiple conductors meet (splice or tee).',
    features: ['All attached terminals commoned'],
    purpose: 'Tie phases, neutrals, or PE without a physical device symbol.',
  },
  connection_point: {
    displayName: 'Connection point',
    description:
      'Wire tap on the schematic. Drop onto an existing wire to splice it; attach more wires with the wire tool.',
    features: ['Auto-splice when placed on a wire span', 'No component label on canvas'],
    purpose: 'Branch or join conductors at a point without a junction box symbol.',
  },
  push_button: {
    displayName: 'Push button',
    description: 'Momentary operator for NO or NC control contacts.',
    features: ['NO/NC contact type', 'Pressed state while pointer held'],
    purpose: 'Start/stop, reset, or inching circuits in motor and control logic.',
  },
  generic_load: {
    displayName: 'Generic load',
    description: 'Unspecified load with user-defined power for current estimation.',
    features: ['Power and power factor', 'Single- or three-phase aware'],
    purpose: 'Placeholder for miscellaneous consumers when exact equipment is unknown.',
  },
  contactor: {
    displayName: 'Contactor',
    description:
      'Power-switching device with coil; main contacts close when coil is energized.',
    features: [
      'A1/A2 coil energization model',
      'Aux NO 13–14 (seal-in) and NC 21–22 (opens when picked) for lamps or peer interlocks',
      'Simulation fault if main-path current exceeds nameplate rating while closed',
    ],
    purpose:
      'Motor starters, lighting banks, or any remotely switched load; see templates/contactor-interlock-two-km.esim for cross-coil interlock.',
  },
  relay: {
    displayName: 'Relay',
    description: 'Electromechanical or equivalent relay for control or signal switching.',
    features: ['Coil pickup logic', 'Dry contact bridging when picked up'],
    purpose: 'Interlocks, alarms, or interface between control domains.',
  },
  smart_relay: {
    displayName: 'Smart relay',
    description:
      'Programmable relay with IN terminals and ladder-style logic gating T1↔T2.',
    features: [
      'Configurable logic program (e.g. OUT1 = IN1 AND NOT IN2)',
      'IN1/IN2 read from terminal potentials; A1/A2 powers internal logic',
      'T1↔T2 closes when program is true and coil supply is present',
    ],
    purpose:
      'Interlocks, pump alternation, or BMS-style boolean control without a full PLC.',
  },
  timer: {
    displayName: 'Timer',
    description: 'Time-delay relay for on-delay, off-delay, or star-delta sequences.',
    features: [
      'Configurable ON-delay in property panel (ms)',
      'Coil must energize first (A1/A2), then IN↔OUT closes after delay',
      'Timer resets when coil drops',
    ],
    purpose: 'Motor star-delta, exhaust fan overrun, or sequential start logic.',
  },
  overload_relay: {
    displayName: 'Overload relay (thermal)',
    description: 'Motor overload protection sensing current and opening control circuit.',
    features: [
      'IEC Class 10/20/30 bimetal thermal integrator',
      'Tolerates inrush; trips on sustained overload',
      'Trip class and motor association',
    ],
    purpose: 'Mandatory with motor starters to limit rotor/stator thermal damage.',
  },
  three_phase_source: {
    displayName: 'Three-phase source',
    description: 'Balanced three-phase supply with line and optional neutral.',
    features: ['Line voltage definition', 'Feeds 3φ MCCBs, contactors, motors'],
    purpose: 'Incomer for industrial plant, mains, or generator set output.',
  },
  three_phase_motor: {
    displayName: 'Three-phase motor',
    description: 'Three-phase induction or general 3φ motor load.',
    features: ['Line current from P and U_L-L', 'Overload coordination'],
    purpose: 'Main plant motors, pumps, and HVAC drives on one-line diagrams.',
  },
  three_phase_mcb: {
    displayName: 'Three-pole MCB',
    description: 'MCB protecting all three line conductors of a three-phase circuit.',
    features: ['Per-phase IN/OUT', 'Common trip state'],
    purpose: 'Final or sub-main protection for 3φ loads and distribution.',
  },
  mccb: {
    displayName: 'MCCB',
    description: 'Molded case circuit breaker for higher currents than MCB.',
    features: ['Multi-pole line protection', 'Adjustable Ir where modeled'],
    purpose: 'Feeders, motor circuits, and sub-mains in commercial/industrial panels.',
  },
  motor_protection_circuit_breaker: {
    displayName: 'Motor protection circuit breaker (MPCB)',
    description: 'MCCB-class device with motor overload and short-circuit protection.',
    features: ['Motor thermal trip class', 'Suited to DOL/RVAT starters'],
    purpose: 'Dedicated motor branch protection in motor control centers.',
  },
  four_phase_mcb: {
    displayName: 'Four-pole MCB',
    description: 'MCB including neutral switching for TT/TN-S or isolated neutral schemes.',
    features: ['L1–L3 + N terminals', 'Common operating state'],
    purpose: 'Where neutral must disconnect with phases for maintenance or regulation.',
  },
  air_circuit_breaker: {
    displayName: 'Air circuit breaker (ACB)',
    description: 'Large withdrawable breaker with advanced protection and optional BMS.',
    features: [
      'Thermal integral and definite-time zones',
      'BMS close/shunt/UVR interlocks when enabled',
    ],
    purpose: 'Main incomer or bus-tie in switchboards and substation LV.',
  },
  motorized_mccb: {
    displayName: 'Motorized MCCB (3P)',
    description: 'MCCB with stored-energy motor operator and shunt/UVR control.',
    features: ['Remote close pulse', 'Shunt trip', 'BMS aux and trip feedback'],
    purpose: 'Critical feeders requiring remote open/close from SCADA or BMS.',
  },
  four_pole_motorized_mccb: {
    displayName: 'Four-pole motorized MCCB',
    description: 'Same as motorized MCCB with neutral pole included.',
    features: ['4P line terminals', 'BMS motor and shunt control'],
    purpose: 'Remote-controlled incomers where neutral disconnection is required.',
  },
  three_phase_contactor: {
    displayName: 'Three-pole contactor',
    description: 'Three-pole power contactor for motor or heater switching.',
    features: [
      'Coil pickup',
      'Main poles T1–T2, T3–T4, T5–T6 (IEC-style line/load pairs)',
      'Simulation fault if summed load current exceeds nameplate rating while closed',
    ],
    purpose: 'Motor starters, capacitor steps, or 3φ load switching.',
  },
  four_phase_contactor: {
    displayName: 'Four-pole contactor',
    description: 'Contactor switching L1–L3 and neutral.',
    features: [
      'Main poles T1–T8 (L1–L3 + N, odd in / even out per pole)',
      'Coil-controlled',
      'Built-in aux 13–14 / 21–22 for seal-in or electrical interlock',
      'Simulation fault if main-path current exceeds nameplate rating while closed',
    ],
    purpose: 'Loads needing switched neutral or certain IT/TT configurations.',
  },
  estop: {
    displayName: 'Emergency stop',
    description: 'Mushroom-head latched NC contact; opening safety chain when pressed.',
    features: ['NC default closed', 'Latched open until reset', 'Safety colour semantics'],
    purpose: 'Mandatory on machine panels per machinery safety practice.',
  },
  selector_switch: {
    displayName: 'Selector switch',
    description: 'Maintained rotary switch (AUTO / OFF / MANUAL).',
    features: [
      'MANUAL: COM ↔ MAN physical bridge for push-buttons',
      'AUTO: COM ↔ AUTO bus; ATS/BMS overrides contactor pickup',
      'ATS sequence controller with open/closed transition',
    ],
    purpose: 'Hand/auto selection, mode control, or maintenance override.',
  },
  indicator_lamp: {
    displayName: 'Indicator lamp',
    description: 'Panel-front pilot lamp driven by control voltage.',
    features: [
      'Colour / phase indication metadata',
      'Selectable supply type (AC or DC)',
      'Load on control circuit when on',
    ],
    purpose: 'Run/fault/trip indication next to operators.',
  },
  phase_indicator_bank: {
    displayName: 'Phase indicator bank',
    description: 'Three-lamp or equivalent L1/L2/L3 presence indication.',
    features: ['Per-phase energization display'],
    purpose: 'Quick verification of rotation and presence on incomers or bus.',
  },
  smps: {
    displayName: 'SMPS',
    description: 'Switch-mode power supply from AC mains to regulated DC bus.',
    features: [
      'AC and DC terminals',
      'Output voltage and rated power (W)',
      'Primary current coupled to DC bus load (η, PF, THD)',
      'Output overload trips supply',
    ],
    purpose: '24 Vdc PLC supplies, field devices, and control power generation.',
  },
  interposing_relay: {
    displayName: 'Interposing relay',
    description: 'Small relay isolating BMS/PLC outputs from higher-power coils.',
    features: ['Coil from weak DO', 'NO contact for CC/shunt commands'],
    purpose: 'Between PLC DO and ACB/MCCB motor or shunt coils.',
  },
  aux_contact_block: {
    displayName: 'Auxiliary contact block',
    description:
      'Snap-on 1NO + 1NC block. Optional “mirror coil” links 13–14 to a contactor/relay pickup for seal-in; otherwise use On/Off.',
    features: [
      '13–14 NO and 21–22 NC',
      'Manual state or mirror a coil (Properties)',
    ],
    purpose: 'Status feedback, interlocks, seal-in with the aux symbol, lamp circuits.',
  },
  energy_meter: {
    displayName: 'Energy meter',
    description: 'Multifunction metering pass-through (V, A, kW, kWh) with optional bus tag.',
    features: ['Always pass-through in simulation', 'Protocol tag for documentation'],
    purpose: 'Sub-metering, tenant billing, or energy monitoring points.',
  },
  digital_multifunction_meter: {
    displayName: 'Digital multifunction meter (DMFM)',
    description: 'Panel meter with pass-through gated by device state for sectional studies.',
    features: ['State-controlled pass-through vs energy meter', 'Multi-phase taps'],
    purpose: 'Supervisory metering where you want an explicit “section in/out” switch.',
  },
  multimeter: {
    displayName: 'Multimeter',
    description: 'Portable instrument symbol for documentation or training.',
    features: ['Measurement mode metadata', 'Non-switching load representation'],
    purpose: 'Illustrate test points or measurement procedures on a diagram.',
  },
  door_interlock: {
    displayName: 'Door interlock',
    description: 'Switch operated by panel door; permissive when door is closed.',
    features: ['NO-style: conducts when closed/on', 'Safety interlock context'],
    purpose: 'Prevent energization or operation with doors open.',
  },
  mechanical_interlock: {
    displayName: 'Mechanical interlock',
    description: 'Permissive contact that is NC by default (conducts when not “tripped”).',
    features: ['Distinct from door interlock logic', 'Used for mutual exclusion schemes'],
    purpose: 'Model key interlocks, drawer position, or breaker interlocking permissives.',
  },
  modbus_tcp_gateway: {
    displayName: 'Modbus TCP gateway',
    description: 'Ethernet device exposing Modbus TCP for supervisory access.',
    features: ['IP/port properties', 'Ethernet-capable terminals'],
    purpose: 'Connect field serial devices to SCADA over Ethernet.',
  },
  modbus_rtu_module: {
    displayName: 'Modbus RTU module',
    description: 'RS485 serial interface module for Modbus RTU field networks.',
    features: ['Baud/parity/stop bits', 'Serial terminal labels'],
    purpose: 'BMS field bus segments, meters, and VFD serial links.',
  },
  bacnet_ip_gateway: {
    displayName: 'BACnet/IP gateway',
    description: 'Gateway for BACnet over IP integration.',
    features: ['IP-oriented metadata', 'Suited to BMS supervisory layer'],
    purpose: 'Enterprise BMS, BACnet BBMD-style integration points.',
  },
  di_module: {
    displayName: 'Digital input module',
    description: 'BMS/PLC rack module reading dry contacts and field digital states.',
    features: ['Multiple DI terminals', 'Common and power pins'],
    purpose: 'Status inputs: breakers, flows, temps-as-digital, remote commands.',
  },
  do_module: {
    displayName: 'Digital output module',
    description: 'Module sinking or sourcing discrete outputs to relays and indicators.',
    features: ['DO channels with COM', '24 V control context'],
    purpose: 'Drive contactor coils, lamps, or solenoids via interposing relays.',
  },
  ai_module: {
    displayName: 'Analog input module',
    description: 'Reads 0–10 V, 4–20 mA, or RTD-style field signals.',
    features: ['Per-channel inputs', 'Shield/FG terminal'],
    purpose: 'Sensors, transmitters, and feedback for control loops.',
  },
  ao_module: {
    displayName: 'Analog output module',
    description: 'Drives analog setpoints to valves, VFDs, or actuators.',
    features: ['Per-channel outputs', 'Common reference'],
    purpose: 'PID outputs and proportional control to field devices.',
  },
  relay_interface_card: {
    displayName: 'Relay interface card',
    description: 'Isolation and fan-out between controller DO and field relays.',
    features: ['Ethernet + DO channels', 'Control power pins'],
    purpose: 'Marshalling between PLC/BMS and high-voltage or high-current coils.',
  },
  communication_converter: {
    displayName: 'Communication converter',
    description: 'Protocol or media converter (serial ↔ Ethernet, etc.).',
    features: ['Mode selection (e.g. RTU↔TCP)', 'Serial and IP parameters'],
    purpose: 'Integrate legacy serial devices into modern IP networks.',
  },
  iot_gateway: {
    displayName: 'IoT gateway',
    description: 'Edge gateway for MQTT/HTTPS uplink and local buffering.',
    features: ['Cloud endpoint metadata', 'Mixed I/O terminal layout'],
    purpose: 'Remote monitoring, predictive maintenance, and cloud dashboards.',
  },
  cloud_monitoring_module: {
    displayName: 'Cloud monitoring module',
    description: 'Appliance focused on secure telemetry to cloud services.',
    features: ['Dual Ethernet where modeled', 'DI/DO for alarms'],
    purpose: 'OEM cloud portals and managed service provider monitoring.',
  },
  energy_management_controller: {
    displayName: 'Energy management controller',
    description: 'Supervisory controller for loads, tariffs, and demand.',
    features: ['RS485 + Ethernet', 'Mixed I/O for plant coordination'],
    purpose: 'Peak shaving, load shedding, and campus-wide energy optimization.',
  },
  ethernet_switch: {
    displayName: 'Industrial Ethernet switch',
    description: 'Layer-2 fan-out for BMS, cameras, and controllers.',
    features: ['Multiple RJ45 ports', 'Shield/earth reference'],
    purpose: 'Physical network topology on electrical/BMS hybrid drawings.',
  },
  signal_isolator: {
    displayName: 'Signal isolator',
    description: 'Repeats an analog process signal across an isolation barrier.',
    features: ['Analog in/out pairs', 'Separate 24 V supply pins', 'Always coupled in sim'],
    purpose: 'Ground loop breaking and intrinsic safety interface planning.',
  },
  optocoupler_module: {
    displayName: 'Optocoupler module',
    description: 'Digital isolation: input LED channel to dry-contact style output.',
    features: ['State-gated output coupling', 'Isolated input vs output rails'],
    purpose: 'PLC DI noise immunity and voltage-level shifting.',
  },
  ups_module: {
    displayName: 'UPS module',
    description: 'Uninterruptible supply bridging mains, battery, and critical load.',
    features: [
      'AC in/out and battery terminals',
      'Inverter backup with SoC depletion and low-voltage trip',
      'Float charge current on AC input when mains present',
    ],
    purpose: 'IT loads, safety PLCs, or critical control where ride-through matters.',
  },
  dc_battery_backup: {
    displayName: 'DC battery backup',
    description: 'Battery string or DC UPS storage element.',
    features: [
      'Positive and negative terminals',
      'Capacity (Ah), remaining charge, and cutoff SoC',
      'Voltage sags as the pack discharges',
    ],
    purpose: '125 Vdc substation tripping, 24 Vdc control, or telecom DC plants.',
  },
  motor_operator_kit: {
    displayName: 'Motor operator kit',
    description: 'Motor-charged spring operator for switch-disconnector or MCCB.',
    features: ['Control L/N and motor output', 'Documentation voltage'],
    purpose: 'Remote closing of large breakers where manual handle is impractical.',
  },
  shunt_trip_coil: {
    displayName: 'Shunt trip coil',
    description: 'Trip coil that opens breaker when energized (trip on command).',
    features: ['A1–A2 continuity when coil state on', 'Used with BMS/relay outputs'],
    purpose:
      'Firefighter / emergency shutdown trip, or remote open command from SCADA.',
  },
  closing_coil: {
    displayName: 'Closing coil (CC)',
    description: 'Pulse coil to close a stored-energy breaker mechanism.',
    features: ['Conducts when energized for schematic continuity', 'Interlock with spring/ready'],
    purpose: 'Remote close of ACB/MCCB from control room or sequence logic.',
  },
  uvr_release: {
    displayName: 'UVR / undervoltage release',
    description: 'Release that trips breaker if control voltage falls (loss of supply).',
    features: ['Coil model with on/off state', 'Interlock with ACB/MCCB BMS paths'],
    purpose: 'Prevent reclosure or hold trip on undervoltage or control failure.',
  },
  key_interlock: {
    displayName: 'Key interlock',
    description: 'Mechanical key trapped or released depending on device position.',
    features: ['IN/OUT permissive path', 'State reflects key position'],
    purpose: 'Maintenance safety: ensure only one feeder or cell is accessible.',
  },
  neutral_link: {
    displayName: 'Neutral link',
    description: 'Insulated neutral conductor link or bar jumper.',
    features: ['N_IN to N_OUT bridge', 'Documentation of neutral topology'],
    purpose: 'Show neutral splitting, PEN separation, or meter N connections.',
  },
  earth_link: {
    displayName: 'Earth link',
    description: 'Protective earth bonding link or bar section.',
    features: ['PE_IN to PE_OUT bridge'],
    purpose: 'Illustrate main earthing terminal (MET) splits or cable PE homing.',
  },
  current_transformer: {
    displayName: 'Current transformer (CT)',
    description: 'Steps primary current down to metering or relay secondary (e.g. 5 A / 1 A).',
    features: ['Primary and secondary terminal pairs', 'Ratio in properties'],
    purpose: 'Metering, protection relays, and ground-fault sensing with CBCT.',
  },
  voltage_transformer: {
    displayName: 'Voltage transformer (VT / PT)',
    description: 'Steps voltage down for instruments and relays.',
    features: ['Primary/secondary L and N mapping', 'Distinct from control transformer'],
    purpose: 'Protection voltage elements, synchrocheck, and metering voltage inputs.',
  },
  din_rail: {
    displayName: 'DIN rail',
    description: 'Mechanical mounting rail for modular devices (documentation).',
    features: ['Anchor points for layout drawings', 'No electrical function in sim'],
    purpose: 'Panel layout and bill of materials for enclosure design.',
  },
  mounting_plate: {
    displayName: 'Mounting plate',
    description: 'Back plate or gland plate for equipment mounting.',
    features: ['Layout anchors only'],
    purpose: 'Mechanical drafting and installation planning.',
  },
  cable_duct: {
    displayName: 'Cable duct / trunking',
    description: 'Wireway for routing and segregation of cables.',
    features: ['Documentation symbol', 'Anchors for routing graphics'],
    purpose: 'Show cable segregation (power vs control) and fill factor planning.',
  },
  busbar_support_insulator: {
    displayName: 'Busbar support insulator',
    description: 'Stand-off insulator supporting rigid bus.',
    features: ['Non-conducting layout element'],
    purpose: 'Clearance and creepage documentation on bus sections.',
  },
  ferrule_cable_markers: {
    displayName: 'Ferrule / cable markers',
    description: 'Wire identification and termination accessories.',
    features: ['Documentation-only'],
    purpose: 'As-built wire numbering and maintenance manuals.',
  },
  control_wiring: {
    displayName: 'Control wiring',
    description: 'Representative control-cable run between two points.',
    features: ['CTRL_FROM to CTRL_TO bridge for continuity studies'],
    purpose: 'Single-line simplification of multi-core control cables.',
  },
  power_cables: {
    displayName: 'Power cables',
    description: 'Representative power cable between source and load.',
    features: ['PWR_FROM to PWR_TO bridge'],
    purpose: 'Route documentation and voltage drop placeholders.',
  },
  ms_gi_sheet_enclosure: {
    displayName: 'MS/GI sheet enclosure',
    description: 'Fabricated steel or galvanized sheet metal enclosure.',
    features: ['Layout anchor', 'Material callout in properties'],
    purpose: 'Outdoor kiosks, motor control centers, and custom panels.',
  },
  ip_rated_enclosure: {
    displayName: 'IP-rated enclosure',
    description: 'Enclosure with ingress protection class (e.g. IP54/IP65).',
    features: ['IP metadata', 'Layout anchor'],
    purpose: 'Wash-down areas, outdoor exposure, and dust control.',
  },
  power_quality_analyzer: {
    displayName: 'Power quality analyzer (PQA)',
    description: 'Instrument monitoring harmonics, dips, swells, and events.',
    features: [
      'Pass-through L1–L3 + N',
      'Aux supply and RS485 for communication',
    ],
    purpose: 'Compliance logging, harmonic surveys, and sensitive load investigations.',
  },
} satisfies Record<ComponentType, ComponentPanelDescription>;

export function getComponentPanelDescription(
  type: ComponentType
): ComponentPanelDescription | undefined {
  const descriptions: Record<string, ComponentPanelDescription> =
    COMPONENT_PANEL_DESCRIPTIONS;
  return Object.hasOwn(descriptions, type) ? descriptions[type] : undefined;
}

export const WIRE_PANEL_DESCRIPTION: ComponentPanelDescription = {
  displayName: 'Wire segment',
  description:
    'Conductive path between two terminals; color and cross-section affect visualization and ampacity context. Control devices are often wired with flexible fine-stranded copper (e.g. H07V-K), typically about 0.5–1.5 mm², for low current, easy routing, and reliable terminations inside control panels — while larger feeders use the full cross-section range on the schedule.',
  features: [
    'Colour coding (L/N/PE, control, Ethernet inference)',
    'Cross-section in mm² (0.5–240 mm² ladder, control through feeders)',
    'Energization and current from simulation',
  ],
  purpose:
    'Connect all devices on the canvas; use appropriate colours and conductor sizes for installation practice, thermal capacity, and clarity.',
};
