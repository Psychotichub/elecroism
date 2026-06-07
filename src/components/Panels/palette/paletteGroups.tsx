import React from 'react';
import type { ComponentType } from '../../../types';
import {
  FiZap,
  FiShield,
  FiToggleLeft,
  FiCircle,
  FiSun,
  FiActivity,
  FiLink,
  FiAlertOctagon,
  FiBatteryCharging,
  FiSliders,
  FiBox,
} from 'react-icons/fi';

export interface PaletteComponentItem {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  detail?: string;
  /** Single-phase MCB palette: drop as 2-pole (L+N) layout. */
  mcbInitialPoles?: 1 | 2;
}

export interface PaletteComponentGroup {
  name: string;
  emoji: string;
  items: PaletteComponentItem[];
}

export const PALETTE_GROUPS: PaletteComponentGroup[] = [
  {
    name: 'Power',
    emoji: '⚡',
    items: [
      { type: 'power_source', label: 'AC Source 230V', icon: <FiZap /> },
      {
        type: 'dc_power_source',
        label: 'DC Supply',
        icon: <FiZap />,
        detail: 'Adjustable V · + / −',
      },
      {
        type: 'ac_dc_converter',
        label: 'AC/DC Converter (linear)',
        icon: <FiZap />,
        detail: 'XFMR → RECT → C → REG · vs SMPS symbol',
      },
      {
        type: 'three_phase_source',
        label: '3φ Supply 400V',
        icon: <FiZap />,
        detail: 'L1 L2 L3 + N',
      },
      { type: 'busbar', label: 'Busbar', icon: <FiActivity />, detail: 'Generic distribution bar' },
      {
        type: 'busbar_system',
        label: 'Busbar system',
        icon: <FiActivity />,
        detail: 'Main copper/aluminium distribution bar',
      },
      {
        type: 'neutral_bar_system',
        label: 'Neutral bar system',
        icon: <FiActivity />,
        detail: 'Neutral distribution bar',
      },
      {
        type: 'earth_bar_grounding_system',
        label: 'Earth bar / grounding',
        icon: <FiActivity />,
        detail: 'Protective earth distribution bar',
      },
    ],
  },
  {
    name: 'Protection',
    emoji: '🛡️',
    items: [
      {
        type: 'mcb',
        label: 'MCB',
        icon: <FiShield />,
        detail: '1P · set rating in properties',
      },
      {
        type: 'hrc_fuse',
        label: 'HRC fuse',
        icon: <FiShield />,
        detail: 'Cartridge fuse · replace after trip',
      },
      {
        type: 'control_circuit_fuse',
        label: 'Control circuit fuse',
        icon: <FiShield />,
        detail: 'Low-amp fuse for control supply branch',
      },
      {
        type: 'earth_leakage_relay_cbct',
        label: 'ELR + CBCT',
        icon: <FiShield />,
        detail: 'Earth fault relay with toroid CT',
      },
      { type: 'rcd', label: 'RCD', icon: <FiShield />, detail: 'Set sensitivity in properties' },
      {
        type: 'residual_current_circuit_breaker',
        label: 'Residual current CB',
        icon: <FiShield />,
        detail: 'RCCB earth-leakage protection',
      },
      { type: 'overload_relay', label: 'Overload Relay', icon: <FiShield /> },
      {
        type: 'three_phase_mcb',
        label: '3P MCB',
        icon: <FiShield />,
        detail: 'L1–L3 · rating in properties',
      },
      {
        type: 'mccb',
        label: 'MCCB',
        icon: <FiShield />,
        detail: '3P molded case circuit breaker',
      },
      {
        type: 'motor_protection_circuit_breaker',
        label: 'MPCB',
        icon: <FiShield />,
        detail: 'Motor protection breaker, 3P',
      },
      {
        type: 'four_phase_mcb',
        label: '4P MCB',
        icon: <FiShield />,
        detail: 'L1–L3 + N · rating in properties',
      },
      {
        type: 'air_circuit_breaker',
        label: 'ACB',
        icon: <FiShield />,
        detail: '4P incomer · Ir / Ii / ST / earth G',
      },
      {
        type: 'motorized_mccb',
        label: 'Motor MCCB',
        icon: <FiShield />,
        detail: '3P + BMS MOT / ST / aux / trip',
      },
      {
        type: 'four_pole_motorized_mccb',
        label: '4P Motor MCCB',
        icon: <FiShield />,
        detail: 'L1–L3 + N + BMS control block',
      },
    ],
  },
  {
    name: 'Controls',
    emoji: '🎛️',
    items: [
      {
        type: 'switch',
        label: 'Switch',
        icon: <FiToggleLeft />,
        detail: 'SPST / DPST in properties',
      },
      {
        type: 'two_way_switch',
        label: 'Two-way switch',
        icon: <FiToggleLeft />,
        detail: 'SPDT: COM · T1 · T2 — double-click to throw',
      },
      {
        type: 'push_button',
        label: 'Push button',
        icon: <FiCircle />,
        detail: 'NO / NC in properties',
      },
      {
        type: 'selector_switch',
        label: 'Selector AUTO/MAN',
        icon: <FiToggleLeft />,
        detail: '3-pos: COM → AUTO / MAN / OFF',
      },
      { type: 'contactor', label: 'Contactor', icon: <FiToggleLeft /> },
      { type: 'relay', label: 'Relay', icon: <FiToggleLeft /> },
      {
        type: 'smart_relay',
        label: 'Smart relay',
        icon: <FiActivity />,
        detail: 'Programmable compact control relay',
      },
      {
        type: 'interposing_relay',
        label: 'Interposing relay',
        icon: <FiToggleLeft />,
        detail: '24 V DC coil · BMS interface',
      },
      {
        type: 'aux_contact_block',
        label: 'Aux contact block',
        icon: <FiToggleLeft />,
        detail: '1NO (13-14) + 1NC (21-22)',
      },
      { type: 'timer', label: 'Timer', icon: <FiToggleLeft /> },
      {
        type: 'three_phase_contactor',
        label: '3P Contactor (KM)',
        icon: <FiToggleLeft />,
        detail: 'L1–L3 + A1 A2 · 13/14 NO · 21/22 NC',
      },
      {
        type: 'four_phase_contactor',
        label: '4P Contactor (KM)',
        icon: <FiToggleLeft />,
        detail: 'L1–L3–N + A1 A2 · 13/14 · 21/22',
      },
    ],
  },
  {
    name: 'Safety',
    emoji: '🛑',
    items: [
      {
        type: 'estop',
        label: 'Emergency Stop',
        icon: <FiAlertOctagon />,
        detail: 'NC mushroom · click latches',
      },
      {
        type: 'door_interlock',
        label: 'Door interlock',
        icon: <FiShield />,
        detail: 'Panel door closed = contact closed',
      },
      {
        type: 'mechanical_interlock',
        label: 'Mechanical interlock',
        icon: <FiShield />,
        detail: 'Mechanical ON/OFF prevention link',
      },
    ],
  },
  {
    name: 'Indicators & Metering',
    emoji: '📟',
    items: [
      {
        type: 'indicator_lamp',
        label: 'Indicator lamp',
        icon: <FiSun />,
        detail: 'Colour + L1/L2/L3 tag in properties',
      },
      {
        type: 'phase_indicator_bank',
        label: 'Phase indicator bank',
        icon: <FiSun />,
        detail: 'L1/L2/L3 panel phase presence lamps',
      },
      {
        type: 'energy_meter',
        label: 'Energy meter',
        icon: <FiActivity />,
        detail: 'V / A / kW · Modbus tag',
      },
      {
        type: 'digital_multifunction_meter',
        label: 'Digital multifunction meter',
        icon: <FiActivity />,
        detail: 'V/A/kW/PF panel metering',
      },
      {
        type: 'multimeter',
        label: 'Digital multimeter',
        icon: <FiActivity />,
        detail: 'Voltage / current / continuity + buzzer',
      },
    ],
  },
  {
    name: 'Control Power',
    emoji: '🔋',
    items: [
      {
        type: 'control_transformer',
        label: 'Control transformer',
        icon: <FiSliders />,
        detail: '415V/230V to 24V control supply',
      },
      {
        type: 'smps',
        label: 'SMPS 24V',
        icon: <FiBatteryCharging />,
        detail: 'Mains AC → DC bus · adjustable V',
      },
      {
        type: 'ups_module',
        label: 'UPS module',
        icon: <FiBatteryCharging />,
        detail: 'Control continuity backup',
      },
      {
        type: 'dc_battery_backup',
        label: 'DC battery backup',
        icon: <FiBatteryCharging />,
        detail: 'Critical control reserve',
      },
      {
        type: 'motor_operator_kit',
        label: 'Motor operator kit',
        icon: <FiToggleLeft />,
        detail: 'Breaker remote ON/OFF actuator',
      },
      {
        type: 'shunt_trip_coil',
        label: 'Shunt trip coil',
        icon: <FiToggleLeft />,
        detail: 'Breaker remote OFF trip coil',
      },
      {
        type: 'closing_coil',
        label: 'Closing coil',
        icon: <FiToggleLeft />,
        detail: 'Breaker remote ON closing actuator',
      },
      {
        type: 'uvr_release',
        label: 'UVR release',
        icon: <FiToggleLeft />,
        detail: 'Undervoltage release hold coil',
      },
    ],
  },
  {
    name: 'BMS Communication',
    emoji: '🌐',
    items: [
      {
        type: 'modbus_rtu_module',
        label: 'Modbus RTU module',
        icon: <FiActivity />,
        detail: 'RS485 serial Modbus interface',
      },
      {
        type: 'modbus_tcp_gateway',
        label: 'Modbus TCP gateway',
        icon: <FiActivity />,
        detail: 'Ethernet supervisory integration',
      },
      {
        type: 'bacnet_ip_gateway',
        label: 'BACnet/IP gateway',
        icon: <FiActivity />,
        detail: 'BAS integration via UDP/IP',
      },
      {
        type: 'communication_converter',
        label: 'Comm converter',
        icon: <FiActivity />,
        detail: 'RS232/RS485/Ethernet bridge',
      },
      {
        type: 'iot_gateway',
        label: 'IoT gateway',
        icon: <FiActivity />,
        detail: 'Edge-to-cloud telemetry bridge',
      },
      {
        type: 'cloud_monitoring_module',
        label: 'Cloud monitoring module',
        icon: <FiActivity />,
        detail: 'Remote dashboard and alert uplink',
      },
      {
        type: 'energy_management_controller',
        label: 'Energy management controller',
        icon: <FiActivity />,
        detail: 'Supervisory optimization/control node',
      },
      {
        type: 'ethernet_switch',
        label: 'Industrial Ethernet switch',
        icon: <FiActivity />,
        detail: 'Network fan-out for BMS devices',
      },
    ],
  },
  {
    name: 'BMS I/O',
    emoji: '🧩',
    items: [
      {
        type: 'di_module',
        label: 'DI module',
        icon: <FiActivity />,
        detail: 'Digital inputs from field contacts',
      },
      {
        type: 'do_module',
        label: 'DO module',
        icon: <FiActivity />,
        detail: 'Digital outputs to relays/coils',
      },
      {
        type: 'ai_module',
        label: 'AI module',
        icon: <FiActivity />,
        detail: 'Analog input (0-10V / 4-20mA)',
      },
      {
        type: 'ao_module',
        label: 'AO module',
        icon: <FiActivity />,
        detail: 'Analog output (0-10V / 4-20mA)',
      },
      {
        type: 'relay_interface_card',
        label: 'Relay interface card',
        icon: <FiActivity />,
        detail: 'Field relay isolation/fan-out',
      },
      {
        type: 'signal_isolator',
        label: 'Signal isolator',
        icon: <FiActivity />,
        detail: 'Galvanic isolation for analog loops',
      },
      {
        type: 'optocoupler_module',
        label: 'Optocoupler module',
        icon: <FiActivity />,
        detail: 'Digital optical isolation',
      },
    ],
  },
  {
    name: 'Infrastructure',
    emoji: '🧱',
    items: [
      {
        type: 'key_interlock',
        label: 'Key interlock',
        icon: <FiShield />,
        detail: 'Safe isolation sequence lock',
      },
      {
        type: 'neutral_link',
        label: 'Neutral link',
        icon: <FiLink />,
        detail: 'Neutral distribution bar',
      },
      {
        type: 'earth_link',
        label: 'Earth link',
        icon: <FiLink />,
        detail: 'Protective earth bar',
      },
      {
        type: 'current_transformer',
        label: 'Current transformer',
        icon: <FiActivity />,
        detail: 'CT ratio for metering',
      },
      {
        type: 'voltage_transformer',
        label: 'Voltage transformer',
        icon: <FiActivity />,
        detail: 'Potential transformer (VT)',
      },
      {
        type: 'din_rail',
        label: 'DIN rail',
        icon: <FiSliders />,
        detail: 'Panel mounting rail',
      },
      {
        type: 'mounting_plate',
        label: 'Mounting plate',
        icon: <FiSliders />,
        detail: 'Equipment backplate / chassis',
      },
      {
        type: 'cable_duct',
        label: 'Cable duct',
        icon: <FiLink />,
        detail: 'Wiring trunking / segregation path',
      },
      {
        type: 'busbar_support_insulator',
        label: 'Busbar support',
        icon: <FiShield />,
        detail: 'Insulated busbar support block',
      },
      {
        type: 'ferrule_cable_markers',
        label: 'Ferrules & markers',
        icon: <FiLink />,
        detail: 'Cable-end ferrules and wire IDs',
      },
      {
        type: 'control_wiring',
        label: 'Control wiring',
        icon: <FiLink />,
        detail: 'Flexible Cu (e.g. H07V-K), often 0.5–1.5 mm² in panels',
      },
      {
        type: 'power_cables',
        label: 'Power cables',
        icon: <FiLink />,
        detail: 'Load-sized feeder/power cabling',
      },
      {
        type: 'ms_gi_sheet_enclosure',
        label: 'MS/GI sheet enclosure',
        icon: <FiBox />,
        detail: 'Sheet-metal panel body/chassis',
      },
      {
        type: 'ip_rated_enclosure',
        label: 'IP rated enclosure',
        icon: <FiBox />,
        detail: 'Panel housing IP54/IP65',
      },
      {
        type: 'power_quality_analyzer',
        label: 'Power quality analyzer',
        icon: <FiActivity />,
        detail: 'Harmonics/events monitoring',
      },
    ],
  },
  {
    name: 'Outlets',
    emoji: '🔌',
    items: [
      {
        type: 'socket',
        label: 'Socket',
        icon: <FiCircle />,
        detail: 'Schuko · rating in properties',
      },
    ],
  },
  {
    name: 'Loads',
    emoji: '💡',
    items: [
      { type: 'lamp', label: 'Lamp', icon: <FiSun />, detail: 'Power in properties' },
      { type: 'motor', label: 'Motor', icon: <FiActivity />, detail: '1φ · power in properties' },
      {
        type: 'three_phase_motor',
        label: '3φ Motor',
        icon: <FiActivity />,
        detail: 'Wye · power in properties',
      },
      { type: 'heater', label: 'Heater', icon: <FiSun />, detail: 'Power in properties' },
      {
        type: 'panel_heater',
        label: 'Panel heater',
        icon: <FiSun />,
        detail: 'Anti-condensation enclosure heater',
      },
      {
        type: 'cooling_fan',
        label: 'Cooling fan',
        icon: <FiActivity />,
        detail: 'Panel ventilation / heat removal',
      },
      { type: 'generic_load', label: 'Generic load', icon: <FiCircle /> },
    ],
  },
  {
    name: 'Wiring',
    emoji: '🔗',
    items: [
      { type: 'junction', label: 'Junction Point', icon: <FiLink /> },
      {
        type: 'connection_point',
        label: 'Connection point',
        icon: <FiLink />,
        detail: 'Tap on a wire — splices automatically',
      },
      { type: 'terminal_block', label: 'Terminal block', icon: <FiLink />, detail: 'Pass-through terminal (IN/OUT)' },
    ],
  },
];

export const ALL_PALETTE_TYPES: ReadonlySet<string> = new Set(
  PALETTE_GROUPS.flatMap((g) => g.items.map((i) => i.type))
);

export const TYPE_TO_GROUP = new Map<string, string>();
for (const g of PALETTE_GROUPS) {
  for (const it of g.items) {
    if (!TYPE_TO_GROUP.has(it.type)) TYPE_TO_GROUP.set(it.type, g.name);
  }
}

export const ITEM_BY_TYPE = new Map<ComponentType, PaletteComponentItem>();
for (const g of PALETTE_GROUPS) {
  for (const it of g.items) {
    if (!ITEM_BY_TYPE.has(it.type)) ITEM_BY_TYPE.set(it.type, it);
  }
}

