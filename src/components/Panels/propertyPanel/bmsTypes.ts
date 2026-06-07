import type { ComponentType } from '../../../types';

/** Component types whose primary type-specific fields live in the BMS section. */
export const BMS_PANEL_TYPES: readonly ComponentType[] = [
  'modbus_tcp_gateway',
  'bacnet_ip_gateway',
  'di_module',
  'do_module',
  'ai_module',
  'ao_module',
  'relay_interface_card',
  'modbus_rtu_module',
  'communication_converter',
  'iot_gateway',
  'cloud_monitoring_module',
  'energy_management_controller',
  'ethernet_switch',
  'signal_isolator',
  'optocoupler_module',
] as const;

const BMS_PANEL_TYPE_SET = new Set<ComponentType>(BMS_PANEL_TYPES);

const BREAKER_BMS_TYPES = new Set<ComponentType>([
  'air_circuit_breaker',
  'motorized_mccb',
  'four_pole_motorized_mccb',
]);

export function isBmsPanelType(type: ComponentType): boolean {
  return BMS_PANEL_TYPE_SET.has(type);
}

export function showBmsPropertySection(type: ComponentType): boolean {
  return isBmsPanelType(type) || BREAKER_BMS_TYPES.has(type);
}
