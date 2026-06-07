import type { CircuitComponent } from '../types';
import { pluginSimConfigFromComponent, pluginIsLoadConfig } from './pluginSimulation';

export function isSeriesPathComponent(c: CircuitComponent): boolean {
  return (
    c.type === 'switch' ||
    c.type === 'two_way_switch' ||
    c.type === 'push_button' ||
    c.type === 'mcb' ||
    c.type === 'hrc_fuse' ||
    c.type === 'control_circuit_fuse' ||
    c.type === 'earth_leakage_relay_cbct' ||
    c.type === 'rcd' ||
    c.type === 'residual_current_circuit_breaker' ||
    c.type === 'overload_relay' ||
    c.type === 'contactor' ||
    c.type === 'relay' ||
    c.type === 'smart_relay' ||
    c.type === 'timer' ||
    c.type === 'three_phase_mcb' ||
    c.type === 'motor_protection_circuit_breaker' ||
    c.type === 'four_phase_mcb' ||
    c.type === 'motorized_mccb' ||
    c.type === 'four_pole_motorized_mccb' ||
    c.type === 'air_circuit_breaker' ||
    c.type === 'three_phase_contactor' ||
    c.type === 'four_phase_contactor' ||
    c.type === 'estop' ||
    c.type === 'door_interlock' ||
    c.type === 'mechanical_interlock' ||
    c.type === 'key_interlock' ||
    c.type === 'selector_switch' ||
    c.type === 'interposing_relay' ||
    c.type === 'aux_contact_block' ||
    c.type === 'energy_meter' ||
    c.type === 'digital_multifunction_meter' ||
    c.type === 'terminal_block'
  );
}

export function isLoadComponent(component: CircuitComponent): boolean {
  if (component.type === 'plugin_component') {
    const cfg = pluginSimConfigFromComponent(component);
    return cfg != null && pluginIsLoadConfig(cfg);
  }
  return (
    component.type === 'lamp' ||
    component.type === 'heater' ||
    component.type === 'panel_heater' ||
    component.type === 'cooling_fan' ||
    component.type === 'generic_load' ||
    component.type === 'motor' ||
    component.type === 'socket' ||
    component.type === 'three_phase_motor' ||
    component.type === 'indicator_lamp'
  );
}
