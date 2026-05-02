import { v4 as uuid } from 'uuid';
import type {
  Circuit,
  ComponentType,
  ComponentProperties,
  CircuitComponent,
} from '../types';

function getDefaultProperties(type: ComponentType): ComponentProperties {
  switch (type) {
    case 'power_source':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'dc_power_source':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'ac_dc_converter':
      return {
        voltage: 24,
        phaseSystem: 'single_phase',
        acDcInputVoltageV: 230,
        acDcMainsFrequencyHz: 50,
        acDcHasTransformer: true,
        acDcRectifierType: 'bridge',
        acDcHasRegulator: true,
      };
    case 'control_transformer':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'modbus_tcp_gateway':
      return {
        gatewayIp: '192.168.1.100',
        gatewaySubnet: '255.255.255.0',
        gatewayDefaultRoute: '192.168.1.1',
        gatewayPort: 502,
        serialBaudRate: 9600,
        serialParity: 'none',
        serialStopBits: 1,
        serialDataBits: 8,
        modbusDefaultSlaveId: 1,
        phaseSystem: 'single_phase',
      } as ComponentProperties;
    case 'modbus_rtu_module':
      return {
        ioChannels: 1,
        phaseSystem: 'single_phase',
      };
    case 'bacnet_ip_gateway':
      return {
        gatewayIp: '192.168.1.110',
        gatewayPort: 47808,
        gatewaySubnet: '255.255.255.0',
        gatewayDefaultRoute: '192.168.1.1',
        bacnetDeviceInstance: 110001,
        bacnetBbmdEnabled: false,
        bacnetBbmdIp: '',
        serialBaudRate: 38400,
        serialParity: 'none',
        serialStopBits: 1,
        serialDataBits: 8,
        mstpMacAddress: 1,
        mstpMaxMaster: 127,
        phaseSystem: 'single_phase',
      } as ComponentProperties;
    case 'di_module':
      return { ioChannels: 8, phaseSystem: 'single_phase' };
    case 'do_module':
      return { ioChannels: 8, phaseSystem: 'single_phase' };
    case 'ai_module':
      return {
        ioChannels: 4,
        aiSignalType: '0_10v',
        phaseSystem: 'single_phase',
      };
    case 'ao_module':
      return {
        ioChannels: 4,
        aoSignalType: '0_10v',
        phaseSystem: 'single_phase',
      };
    case 'relay_interface_card':
      return {
        ioChannels: 8,
        phaseSystem: 'single_phase',
        gatewayIp: '192.168.1.150',
        gatewayPort: 502,
      };
    case 'communication_converter':
      return {
        gatewayIp: '192.168.1.120',
        gatewayPort: 502,
        commConverterMode: 'modbus_rtu_to_modbus_tcp',
        serialBaudRate: 9600,
        serialParity: 'none',
        serialStopBits: 1,
        serialDataBits: 8,
        phaseSystem: 'single_phase',
      } as ComponentProperties;
    case 'iot_gateway':
      return {
        gatewayIp: '10.10.10.10',
        gatewayPort: 8883,
        ioChannels: 1,
        phaseSystem: 'single_phase',
      };
    case 'cloud_monitoring_module':
      return {
        gatewayIp: 'cloud.bms.local',
        gatewayPort: 443,
        ioChannels: 1,
        phaseSystem: 'single_phase',
      };
    case 'energy_management_controller':
      return {
        gatewayIp: '192.168.1.210',
        gatewayPort: 502,
        ioChannels: 16,
        phaseSystem: 'single_phase',
      };
    case 'ethernet_switch':
      return {
        ioChannels: 5,
        gatewayIp: '192.168.1.200',
        phaseSystem: 'single_phase',
      };
    case 'signal_isolator':
      return { ioChannels: 1, aiSignalType: '4_20ma', phaseSystem: 'single_phase' };
    case 'optocoupler_module':
      return { ioChannels: 1, phaseSystem: 'single_phase' };
    case 'ups_module':
      return { ratingAmps: 10, phaseSystem: 'single_phase' };
    case 'dc_battery_backup':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'motor_operator_kit':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'shunt_trip_coil':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'closing_coil':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'uvr_release':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'key_interlock':
      return { phaseSystem: 'single_phase' };
    case 'neutral_link':
      return { phaseSystem: 'single_phase' };
    case 'earth_link':
      return { phaseSystem: 'single_phase' };
    case 'current_transformer':
      return { meterCtPrimary: 100, phaseSystem: 'single_phase' };
    case 'voltage_transformer':
      return { phaseVoltage: 230, voltage: 110, phaseSystem: 'single_phase' };
    case 'din_rail':
      return { phaseSystem: 'single_phase' };
    case 'mounting_plate':
      return { phaseSystem: 'single_phase' };
    case 'cable_duct':
      return { phaseSystem: 'single_phase' };
    case 'busbar_support_insulator':
      return { phaseSystem: 'single_phase' };
    case 'ferrule_cable_markers':
      return { phaseSystem: 'single_phase' };
    case 'control_wiring':
      return { phaseSystem: 'single_phase' };
    case 'power_cables':
      return { phaseSystem: 'single_phase' };
    case 'ms_gi_sheet_enclosure':
      return { phaseSystem: 'single_phase' };
    case 'ip_rated_enclosure':
      return { phaseSystem: 'single_phase' };
    case 'power_quality_analyzer':
      return { meterProtocol: 'modbus_tcp', phaseSystem: 'single_phase' };
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
    case 'mccb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'motor_protection_circuit_breaker':
      return {
        ratingAmps: 12,
        breakingCapacity: 6000,
        mpcbTripClass: '10',
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'motorized_mccb':
      return {
        ratingAmps: 63,
        tripCurve: 'C',
        breakingCapacity: 10000,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        mccbBmsEnabled: false,
        mccbBmsCtrlVoltageOk: true,
        mccbBmsMotorReady: true,
        mccbBmsProtocol: 'none' as const,
        mccbCtrlSupply: '24dc',
        mccbCtrlFuseDesignation: 'F1',
        mccbCtrlFuseAmps: 2,
        mccbRelayMotorId: 'K1',
        mccbRelayStId: 'K2',
        mccbBmsDoMotorTag: 'DO-MOTOR',
        mccbBmsDoShuntTag: 'DO-ST',
        mccbBmsDiAuxNoTag: 'DI-AUX-NO',
        mccbBmsDiAuxNcTag: 'DI-AUX-NC',
        mccbBmsDiTripTag: 'DI-TRIP',
      };
    case 'four_pole_motorized_mccb':
      return {
        ratingAmps: 63,
        tripCurve: 'C',
        breakingCapacity: 10000,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        mccbBmsEnabled: false,
        mccbBmsCtrlVoltageOk: true,
        mccbBmsMotorReady: true,
        mccbBmsProtocol: 'none' as const,
        mccbCtrlSupply: '24dc',
        mccbCtrlFuseDesignation: 'F1',
        mccbCtrlFuseAmps: 2,
        mccbRelayMotorId: 'K1',
        mccbRelayStId: 'K2',
        mccbBmsDoMotorTag: 'DO-MOTOR',
        mccbBmsDoShuntTag: 'DO-ST',
        mccbBmsDiAuxNoTag: 'DI-AUX-NO',
        mccbBmsDiAuxNcTag: 'DI-AUX-NC',
        mccbBmsDiTripTag: 'DI-TRIP',
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
    case 'hrc_fuse':
      return {
        ratingAmps: 32,
        breakingCapacity: 10000,
        poles: 1,
        hrcType: 'gG',
        hrcBreakingCapacityKa: 80,
        hrcFusingFactor: 1.6,
        hrcI2tA2s: 12000,
        phaseSystem: 'single_phase',
      };
    case 'control_circuit_fuse':
      return {
        ratingAmps: 2,
        breakingCapacity: 6000,
        controlCircuitSupplyMode: 'single_phase_ln',
        controlCircuitVoltage: 230,
        phaseSystem: 'single_phase',
      };
    case 'earth_leakage_relay_cbct':
      return {
        ratingAmps: 63,
        earthLeakageTripMa: 30,
        elrTripDelayMs: 0,
        poles: 1,
        phaseSystem: 'single_phase',
      };
    case 'rcd':
    case 'residual_current_circuit_breaker':
      return {
        ratingAmps: 40,
        rcdSensitivity: 30,
        rcdType: 'A',
        rcdTripTimeMs: 30,
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
    case 'panel_heater':
      return {
        powerWatts: 100,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'cooling_fan':
      return {
        powerWatts: 40,
        loadType: 'inductive',
        powerFactor: 0.85,
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
    case 'busbar_system':
      return { wireColor: 'brown', phaseSystem: 'single_phase' };
    case 'neutral_bar_system':
      return { wireColor: 'blue', phaseSystem: 'single_phase' };
    case 'earth_bar_grounding_system':
      return { wireColor: 'green_yellow', phaseSystem: 'single_phase' };
    case 'terminal_block':
      return { phaseSystem: 'single_phase' };
    case 'contactor':
    case 'relay':
    case 'smart_relay':
      return { ratingAmps: 25, phaseSystem: 'single_phase' };
    case 'timer':
      return { ratingAmps: 25, timerDelayMs: 1000, phaseSystem: 'single_phase' };
    case 'estop':
      return { phaseSystem: 'single_phase' };
    case 'door_interlock':
    case 'mechanical_interlock':
      return { phaseSystem: 'single_phase' };
    case 'selector_switch':
      return {
        selectorPosition: 'OFF',
        phaseSystem: 'single_phase',
      };
    case 'indicator_lamp':
      return {
        powerWatts: 1,
        loadType: 'resistive',
        powerFactor: 1,
        indicatorColor: 'red',
        indicatorPhaseTag: 'L',
        indicatorSupplyType: 'ac',
        phaseSystem: 'single_phase',
      };
    case 'phase_indicator_bank':
      return { lineVoltage: 400, powerWatts: 3, phaseSystem: 'three_phase' };
    case 'smps':
      return {
        voltage: 24,
        phaseSystem: 'single_phase',
        meterProtocol: 'none',
      };
    case 'interposing_relay':
      return {
        ratingAmps: 6,
        relayCoilVoltage: 24,
        relayCoilSupply: '24dc',
        phaseSystem: 'single_phase',
      };
    case 'aux_contact_block':
      return {
        ratingAmps: 10,
        phaseSystem: 'single_phase',
      };
    case 'energy_meter':
    case 'digital_multifunction_meter':
      return {
        lineVoltage: 400,
        ratingAmps: 100,
        meterProtocol: 'modbus_rtu',
        meterCtPrimary: 100,
        meterCommAddress: 1,
        meterShowKwh: true,
        phaseSystem: 'three_phase',
      };
    case 'multimeter':
      return {
        multimeterMode: 'voltage',
        multimeterSignal: 'auto',
        multimeterHighVoltage: true,
        multimeterMaxVoltage: 1000,
        phaseSystem: 'single_phase',
      } as ComponentProperties;
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
    dc_power_source: 'DC Supply',
    ac_dc_converter: 'AC/DC',
    control_transformer: 'CTRL XFMR',
    modbus_tcp_gateway: 'MB TCP GW',
    modbus_rtu_module: 'MB RTU',
    bacnet_ip_gateway: 'BACnet GW',
    di_module: 'DI MOD',
    do_module: 'DO MOD',
    ai_module: 'AI MOD',
    ao_module: 'AO MOD',
    relay_interface_card: 'REL IF',
    smart_relay: 'SMART REL',
    communication_converter: 'COMM CVT',
    iot_gateway: 'IOT GW',
    cloud_monitoring_module: 'CLOUD MON',
    energy_management_controller: 'EMC',
    aux_contact_block: 'AUX BLOCK',
    ethernet_switch: 'ETH SW',
    signal_isolator: 'ISOLATOR',
    optocoupler_module: 'OPTO',
    ups_module: 'UPS',
    dc_battery_backup: 'DC BAT',
    motor_operator_kit: 'MOTOR OP',
    shunt_trip_coil: 'ST COIL',
    closing_coil: 'CC COIL',
    uvr_release: 'UVR',
    key_interlock: 'KEY LOCK',
    neutral_link: 'N LINK',
    earth_link: 'PE LINK',
    current_transformer: 'CT',
    voltage_transformer: 'VT',
    din_rail: 'DIN RAIL',
    mounting_plate: 'MOUNT PLATE',
    cable_duct: 'DUCT',
    busbar_support_insulator: 'BUSBAR SUP',
    ferrule_cable_markers: 'FERRULE',
    control_wiring: 'CTRL WIRE',
    power_cables: 'PWR CABLE',
    ms_gi_sheet_enclosure: 'MS/GI ENC',
    ip_rated_enclosure: 'ENCLOSURE',
    power_quality_analyzer: 'PQA',
    switch: 'Switch',
    push_button: 'PB',
    mcb: 'MCB',
    hrc_fuse: 'HRC Fuse',
    control_circuit_fuse: 'CTRL Fuse',
    earth_leakage_relay_cbct: 'ELR+CBCT',
    rcd: 'RCD',
    residual_current_circuit_breaker: 'RCCB',
    overload_relay: 'OLR',
    socket: 'Socket',
    lamp: 'Lamp',
    motor: 'Motor',
    heater: 'Heater',
    panel_heater: 'Panel Heater',
    cooling_fan: 'Cooling Fan',
    generic_load: 'Load',
    busbar: 'Busbar',
    busbar_system: 'Busbar SYS',
    neutral_bar_system: 'NEUTRAL BAR',
    earth_bar_grounding_system: 'EARTH BAR',
    terminal_block: 'TB',
    junction: 'Junction',
    contactor: 'Contactor',
    relay: 'Relay',
    timer: 'Timer',
    three_phase_source: '3φ Supply',
    three_phase_motor: '3φ Motor',
    three_phase_mcb: '3P MCB',
    mccb: 'MCCB',
    motor_protection_circuit_breaker: 'MPCB',
    four_phase_mcb: '4P MCB',
    motorized_mccb: 'mMCCB',
    four_pole_motorized_mccb: '4P mMCCB',
    air_circuit_breaker: 'ACB',
    three_phase_contactor: '3P KM',
    four_phase_contactor: '4P KM',
    estop: 'E-STOP',
    door_interlock: 'Door SW',
    mechanical_interlock: 'MECH INTLK',
    selector_switch: 'AUTO/MAN',
    indicator_lamp: 'HL',
    phase_indicator_bank: 'L1/L2/L3',
    smps: 'SMPS 24V',
    interposing_relay: 'K-IF',
    energy_meter: 'EM',
    digital_multifunction_meter: 'DMFM',
    multimeter: 'DMM',
  };
  return labels[type] || type;
}

function getInitialState(type: ComponentType): CircuitComponent['state'] {
  // Components that represent user-operated switching/protection start open/off.
  const startsOff = new Set<ComponentType>([
    'switch',
    'push_button',
    'mcb',
    'hrc_fuse',
    'control_circuit_fuse',
    'earth_leakage_relay_cbct',
    'rcd',
    'residual_current_circuit_breaker',
    'contactor',
    'relay',
    'smart_relay',
    'timer',
    'overload_relay',
    'three_phase_mcb',
    'mccb',
    'motor_protection_circuit_breaker',
    'four_phase_mcb',
    'motorized_mccb',
    'four_pole_motorized_mccb',
    'air_circuit_breaker',
    'three_phase_contactor',
    'four_phase_contactor',
    'interposing_relay',
    'aux_contact_block',
    'mechanical_interlock',
    'key_interlock',
  ]);

  if (type === 'push_button') return 'off';
  // E-Stop is normally closed (safe state == coil/loop continuous).
  // Selector / indicator / SMPS / energy_meter conduct passively, so 'on'.
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
    phaseImbalanceWarningPercent: 15,
    wireLabelsVisible: true,
  };
}

export {
  getDefaultProperties,
  getDefaultLabel,
  getInitialState,
  createEmptyCircuit,
};
