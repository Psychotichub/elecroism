import type {
  CircuitComponent,
  ComponentType,
  DrawingLayerId,
  Wire,
} from '../types';

export const DRAWING_LAYER_ORDER: DrawingLayerId[] = [
  'power',
  'control',
  'instrumentation',
];

export const DRAWING_LAYER_LABELS: Record<DrawingLayerId, string> = {
  power: 'Power',
  control: 'Control',
  instrumentation: 'Instrumentation',
};

export const DRAWING_LAYER_WASH_COLORS: Record<DrawingLayerId, string> = {
  power: 'rgba(239, 68, 68, 0.1)',
  control: 'rgba(59, 130, 246, 0.1)',
  instrumentation: 'rgba(168, 85, 247, 0.1)',
};

const CONTROL_TYPES = new Set<ComponentType>([
  'switch',
  'two_way_switch',
  'push_button',
  'contactor',
  'relay',
  'smart_relay',
  'timer',
  'overload_relay',
  'estop',
  'selector_switch',
  'interposing_relay',
  'aux_contact_block',
  'door_interlock',
  'mechanical_interlock',
  'control_transformer',
  'control_circuit_fuse',
  'control_wiring',
  'motor_operator_kit',
  'shunt_trip_coil',
  'closing_coil',
  'uvr_release',
  'key_interlock',
  'junction',
  'connection_point',
  'terminal_block',
]);

const INSTRUMENTATION_TYPES = new Set<ComponentType>([
  'energy_meter',
  'digital_multifunction_meter',
  'multimeter',
  'current_transformer',
  'voltage_transformer',
  'indicator_lamp',
  'phase_indicator_bank',
  'modbus_tcp_gateway',
  'modbus_rtu_module',
  'bacnet_ip_gateway',
  'di_module',
  'do_module',
  'ai_module',
  'ao_module',
  'relay_interface_card',
  'communication_converter',
  'iot_gateway',
  'cloud_monitoring_module',
  'energy_management_controller',
  'ethernet_switch',
  'signal_isolator',
  'optocoupler_module',
]);

export function inferComponentDrawingLayer(type: ComponentType): DrawingLayerId {
  if (INSTRUMENTATION_TYPES.has(type)) return 'instrumentation';
  if (CONTROL_TYPES.has(type)) return 'control';
  return 'power';
}

export function inferWireDrawingLayer(wire: Wire): DrawingLayerId {
  if (wire.drawingLayer) return wire.drawingLayer;
  switch (wire.styleLayer) {
    case 'power_ac':
    case 'power_dc':
    case 'earth_pe':
    case 'neutral':
      return 'power';
    case 'control_ac':
    case 'control_dc':
      return 'control';
    case 'communication':
    case 'instrumentation_analog':
      return 'instrumentation';
    default:
      break;
  }
  if (wire.wireCategory === 'comm') return 'instrumentation';
  if (wire.wireCategory === 'control') return 'control';
  return 'power';
}

export function resolveComponentDrawingLayer(
  component: CircuitComponent
): DrawingLayerId {
  return component.drawingLayer ?? inferComponentDrawingLayer(component.type);
}

export function resolveWireDrawingLayer(wire: Wire): DrawingLayerId {
  return inferWireDrawingLayer(wire);
}
