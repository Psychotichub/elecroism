import React from 'react';
import type { ComponentType } from '../../../types';
import { usePPCtx } from './PropertyPanelContext';
import { BMS_PANEL_TYPES } from './bmsTypes';
import * as SwitchEditors from './editors/SwitchEditors';
import * as ProtectionEditors from './editors/ProtectionEditors';
import * as MotorizedBreakerEditors from './editors/MotorizedBreakerEditors';
import * as LoadEditors from './editors/LoadEditors';
import * as SourceEditors from './editors/SourceEditors';
import * as ThreePhaseEditors from './editors/ThreePhaseEditors';
import * as ControlEditors from './editors/ControlEditors';
import * as CommEditors from './editors/CommEditors';
import * as MeteringEditors from './editors/MeteringEditors';
import * as TerminalBlockEditors from './editors/TerminalBlockEditors';
import { PluginTypeSpecificProps } from './PluginTypeSpecificProps';

type TypeSpecificPropsOptions = {
  onlyTypes?: readonly ComponentType[];
  excludeTypes?: readonly ComponentType[];
};

function matchesTypeFilter(
  type: ComponentType,
  onlyTypes?: readonly ComponentType[],
  excludeTypes?: readonly ComponentType[]
): boolean {
  if (onlyTypes && !onlyTypes.includes(type)) return false;
  if (excludeTypes?.includes(type)) return false;
  return true;
}

export const TypeSpecificProps: React.FC<TypeSpecificPropsOptions> = ({
  onlyTypes,
  excludeTypes,
}) => {
  const { selectedComp } = usePPCtx();
  if (!selectedComp) return null;
  if (!matchesTypeFilter(selectedComp.type, onlyTypes, excludeTypes)) {
    return null;
  }
  switch (selectedComp.type) {
    case 'switch': return <SwitchEditors.renderSwitchProps />;
    case 'two_way_switch': return <SwitchEditors.renderTwoWaySwitchProps />;
    case 'push_button': return <SwitchEditors.renderPushButtonProps />;
    case 'mcb': return <>{ProtectionEditors.renderMCBProps()}</>;
    case 'hrc_fuse':
    case 'control_circuit_fuse': return <ProtectionEditors.renderHrcFuseProps />;
    case 'three_phase_mcb':
    case 'mccb':
    case 'four_phase_mcb': return <MotorizedBreakerEditors.renderMultipoleMcbProps />;
    case 'overload_relay': return <ProtectionEditors.renderOverloadRelayProps />;
    case 'motor_protection_circuit_breaker': return <ProtectionEditors.renderMpcbProps />;
    case 'air_circuit_breaker': return <MotorizedBreakerEditors.renderAirCircuitBreakerProps />;
    case 'motorized_mccb':
    case 'four_pole_motorized_mccb': return <MotorizedBreakerEditors.renderMotorizedMccbProps />;
    case 'rcd':
    case 'residual_current_circuit_breaker': return <ProtectionEditors.renderRCDProps />;
    case 'earth_leakage_relay_cbct': return <ProtectionEditors.renderEarthLeakageRelayCbctProps />;
    case 'socket': return <LoadEditors.renderSocketProps />;
    case 'lamp':
    case 'motor':
    case 'heater':
    case 'panel_heater':
    case 'cooling_fan':
    case 'generic_load': return <LoadEditors.renderLoadProps />;
    case 'power_source': return <SourceEditors.renderPowerSourceProps />;
    case 'dc_power_source': return <SourceEditors.renderDcPowerSourceProps />;
    case 'ac_dc_converter': return <SourceEditors.renderAcDcConverterProps />;
    case 'control_transformer': return <SourceEditors.renderControlTransformerProps />;
    case 'modbus_tcp_gateway': return <CommEditors.renderModbusTcpGatewayProps />;
    case 'bacnet_ip_gateway': return <CommEditors.renderBacnetIpGatewayProps />;
    case 'di_module':
    case 'do_module':
    case 'ai_module':
    case 'ao_module': return <CommEditors.renderBmsIOModuleProps />;
    case 'relay_interface_card':
    case 'modbus_rtu_module':
    case 'communication_converter':
    case 'iot_gateway':
    case 'cloud_monitoring_module':
    case 'energy_management_controller':
    case 'ethernet_switch': return <CommEditors.renderCommInfraProps />;
    case 'signal_isolator':
    case 'optocoupler_module': return <CommEditors.renderSignalIsolationProps />;
    case 'ups_module':
    case 'dc_battery_backup':
    case 'neutral_link':
    case 'earth_link':
    case 'current_transformer':
    case 'voltage_transformer':
    case 'din_rail':
    case 'mounting_plate':
    case 'cable_duct':
    case 'busbar_support_insulator':
    case 'ferrule_cable_markers':
    case 'control_wiring':
    case 'power_cables':
    case 'ms_gi_sheet_enclosure':
    case 'ip_rated_enclosure':
    case 'power_quality_analyzer': return <MeteringEditors.renderPowerAuxProps />;
    case 'motor_operator_kit':
    case 'shunt_trip_coil':
    case 'closing_coil':
    case 'uvr_release': return <ControlEditors.RenderBreakerAccessoryProps />;

    case 'terminal_block': return <TerminalBlockEditors.RenderTerminalBlockProps />;
    case 'busbar':
    case 'busbar_system':
    case 'neutral_bar_system':
    case 'earth_bar_grounding_system': return <TerminalBlockEditors.RenderBusbarProps />;
    case 'three_phase_source': return <SourceEditors.renderThreePhaseSourceProps />;
    case 'three_phase_motor': return <ThreePhaseEditors.renderThreePhaseMotorProps />;
    case 'three_phase_contactor':
    case 'four_phase_contactor': return <ThreePhaseEditors.renderThreePhaseContactorProps />;
    case 'timer': return <ControlEditors.RenderTimerProps />;
    case 'smart_relay': return <ControlEditors.RenderSmartRelayProps />;
    case 'estop': return <SwitchEditors.renderEStopProps />;
    case 'door_interlock': return <SwitchEditors.renderDoorInterlockProps />;
    case 'mechanical_interlock': return <ControlEditors.RenderMechanicalInterlockProps />;
    case 'key_interlock': return <ControlEditors.RenderKeyInterlockProps />;
    case 'selector_switch': return <SwitchEditors.renderSelectorSwitchProps />;
    case 'indicator_lamp': return <LoadEditors.renderIndicatorLampProps />;
    case 'phase_indicator_bank': return <LoadEditors.renderPhaseIndicatorBankProps />;
    case 'smps': return <SourceEditors.renderSmpsProps />;
    case 'interposing_relay': return <ControlEditors.RenderInterposingRelayProps />;
    case 'aux_contact_block': return <ControlEditors.RenderAuxContactBlockProps />;
    case 'energy_meter':
    case 'digital_multifunction_meter': return <MeteringEditors.renderEnergyMeterProps />;
    case 'multimeter': return <MeteringEditors.renderMultimeterProps />;
    case 'plugin_component': return <PluginTypeSpecificProps />;
    default: return null;
  }
};

export const BmsTypeSpecificProps: React.FC = () => (
  <TypeSpecificProps onlyTypes={BMS_PANEL_TYPES} />
);
