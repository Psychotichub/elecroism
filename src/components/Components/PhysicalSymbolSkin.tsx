import React from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import type { CircuitComponent, ComponentType, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import {
  DeviceBody,
  DisplayWindow,
  PhaseTag,
  StatusLed,
  TerminalPocket,
  VentSlots,
} from './SymbolPrimitives';
import { SymbolColors } from './SymbolTokens';

type Props = {
  component: CircuitComponent;
  nodeResult?: NodeResult;
};

type SkinKind =
  | 'protection'
  | 'control'
  | 'source'
  | 'load'
  | 'meter'
  | 'automation'
  | 'terminal'
  | 'busbar'
  | 'mechanical'
  | 'junction';

const protectionTypes = new Set<ComponentType>([
  'mcb',
  'hrc_fuse',
  'control_circuit_fuse',
  'earth_leakage_relay_cbct',
  'rcd',
  'residual_current_circuit_breaker',
  'three_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'four_phase_mcb',
  'air_circuit_breaker',
  'motorized_mccb',
  'four_pole_motorized_mccb',
]);

const controlTypes = new Set<ComponentType>([
  'switch',
  'push_button',
  'contactor',
  'relay',
  'smart_relay',
  'timer',
  'overload_relay',
  'three_phase_contactor',
  'four_phase_contactor',
  'estop',
  'selector_switch',
  'indicator_lamp',
  'interposing_relay',
  'aux_contact_block',
  'door_interlock',
  'mechanical_interlock',
]);

const sourceTypes = new Set<ComponentType>([
  'power_source',
  'dc_power_source',
  'ac_dc_converter',
  'control_transformer',
  'three_phase_source',
  'smps',
  'ups_module',
  'dc_battery_backup',
]);

const loadTypes = new Set<ComponentType>([
  'lamp',
  'motor',
  'heater',
  'panel_heater',
  'cooling_fan',
  'generic_load',
  'three_phase_motor',
]);

const meterTypes = new Set<ComponentType>([
  'energy_meter',
  'digital_multifunction_meter',
  'multimeter',
  'phase_indicator_bank',
  'power_quality_analyzer',
]);

const automationTypes = new Set<ComponentType>([
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

const terminalTypes = new Set<ComponentType>([
  'terminal_block',
  'socket',
  'neutral_link',
  'earth_link',
  'current_transformer',
  'voltage_transformer',
]);

const busbarTypes = new Set<ComponentType>([
  'busbar',
  'busbar_system',
  'neutral_bar_system',
  'earth_bar_grounding_system',
]);

const mechanicalTypes = new Set<ComponentType>([
  'motor_operator_kit',
  'shunt_trip_coil',
  'closing_coil',
  'uvr_release',
  'key_interlock',
  'din_rail',
  'mounting_plate',
  'cable_duct',
  'busbar_support_insulator',
  'ferrule_cable_markers',
  'control_wiring',
  'power_cables',
  'ms_gi_sheet_enclosure',
  'ip_rated_enclosure',
]);

function skinKind(type: ComponentType): SkinKind {
  if (protectionTypes.has(type)) return 'protection';
  if (controlTypes.has(type)) return 'control';
  if (sourceTypes.has(type)) return 'source';
  if (loadTypes.has(type)) return 'load';
  if (meterTypes.has(type)) return 'meter';
  if (automationTypes.has(type)) return 'automation';
  if (terminalTypes.has(type)) return 'terminal';
  if (busbarTypes.has(type)) return 'busbar';
  if (mechanicalTypes.has(type)) return 'mechanical';
  if (type === 'junction') return 'junction';
  return 'mechanical';
}

function localBounds(component: CircuitComponent) {
  const xs = component.connectionPoints.map((p) => p.x);
  const ys = component.connectionPoints.map((p) => p.y);
  xs.push(-14, 14, 0);
  ys.push(-14, 14, 0);
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxX - minX < 34) {
    const cx = (minX + maxX) / 2;
    minX = cx - 17;
    maxX = cx + 17;
  }
  if (maxY - minY < 34) {
    const cy = (minY + maxY) / 2;
    minY = cy - 17;
    maxY = cy + 17;
  }
  return { minX, maxX, minY, maxY };
}

function skinLabel(type: ComponentType): string {
  const labels: Partial<Record<ComponentType, string>> = {
    power_source: 'AC',
    dc_power_source: 'DC',
    three_phase_source: '3PH',
    ac_dc_converter: 'AC/DC',
    control_transformer: 'TX',
    smps: 'SMPS',
    ups_module: 'UPS',
    dc_battery_backup: 'BAT',
    mcb: 'MCB',
    three_phase_mcb: '3P',
    four_phase_mcb: '4P',
    mccb: 'MCCB',
    motorized_mccb: 'mMCCB',
    four_pole_motorized_mccb: '4P mM',
    air_circuit_breaker: 'ACB',
    hrc_fuse: 'HRC',
    control_circuit_fuse: 'FUSE',
    earth_leakage_relay_cbct: 'ELR',
    rcd: 'RCD',
    residual_current_circuit_breaker: 'RCCB',
    contactor: 'KM',
    relay: 'K',
    smart_relay: 'SR',
    timer: 'TMR',
    overload_relay: 'OL',
    three_phase_contactor: 'KM3',
    four_phase_contactor: 'KM4',
    interposing_relay: 'IR',
    aux_contact_block: 'AUX',
    energy_meter: 'METER',
    digital_multifunction_meter: 'MFM',
    multimeter: 'DMM',
    phase_indicator_bank: 'PILOT',
    di_module: 'DI',
    do_module: 'DO',
    ai_module: 'AI',
    ao_module: 'AO',
    modbus_tcp_gateway: 'TCP',
    modbus_rtu_module: 'RTU',
    bacnet_ip_gateway: 'BACnet',
    ethernet_switch: 'SW',
    signal_isolator: 'ISO',
    optocoupler_module: 'OPTO',
    terminal_block: 'TB',
    socket: 'SOCK',
    busbar: 'BUSBAR',
    busbar_system: 'BUSBAR',
    neutral_bar_system: 'N BAR',
    earth_bar_grounding_system: 'PE BAR',
  };
  return labels[type] ?? type.replaceAll('_', ' ').slice(0, 7).toUpperCase();
}

const phaseColors = ['#B91C1C', '#F59E0B', '#2563EB', '#64748B'];

const PhysicalSymbolSkin: React.FC<Props> = ({ component, nodeResult }) => {
  if (component.type === 'wire') return null;

  const kind = skinKind(component.type);
  const energized = Boolean(nodeResult?.energized);
  const { minX, maxX, minY, maxY } = localBounds(component);
  const compact = kind === 'junction';
  const padX = compact ? 5 : kind === 'busbar' ? 8 : 12;
  const padY = compact ? 5 : kind === 'busbar' ? 6 : 10;
  const x = minX - padX;
  const y = minY - padY;
  const width = maxX - minX + padX * 2;
  const height = maxY - minY + padY * 2;
  const label = skinLabel(component.type);
  const liveColor =
    kind === 'automation' ? SymbolColors.comm :
    kind === 'source' ? SymbolColors.live :
    kind === 'load' ? '#FB923C' :
    kind === 'meter' ? '#22C55E' :
    SymbolColors.on;

  const terminalPoints = component.connectionPoints.slice(0, 8);

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      listening={false}
      opacity={0.9}
    >
      <ScaledSymbolInner component={component}>
        {kind === 'busbar' ? (
          <Rect
            x={x}
            y={y + height / 2 - 4}
            width={width}
            height={8}
            fill={
              component.type === 'earth_bar_grounding_system'
                ? '#65A30D'
                : component.type === 'neutral_bar_system'
                  ? '#2563EB'
                  : '#B87333'
            }
            stroke="#374151"
            strokeWidth={1}
            cornerRadius={3}
            opacity={0.45}
          />
        ) : compact ? (
          <Circle
            x={(minX + maxX) / 2}
            y={(minY + maxY) / 2}
            radius={Math.max(width, height) / 2}
            fill="#F8FAFC"
            stroke="#64748B"
            strokeWidth={1}
            opacity={0.8}
          />
        ) : (
          <DeviceBody
            x={x}
            y={y}
            width={width}
            height={height}
            energized={energized}
            cornerRadius={kind === 'load' || kind === 'meter' ? 6 : 4}
          />
        )}

        {kind !== 'junction' && kind !== 'busbar' && (
          <Rect
            x={x + 4}
            y={y + 4}
            width={Math.max(10, width - 8)}
            height={10}
            fill={
              kind === 'protection'
                ? '#FFFFFF'
                : kind === 'automation'
                  ? '#E0F2FE'
                  : kind === 'source'
                    ? '#FEF3C7'
                    : '#F8FAFC'
            }
            stroke="#CBD5E1"
            strokeWidth={0.6}
            cornerRadius={2}
            opacity={0.72}
          />
        )}

        {kind !== 'junction' && (
          <Text
            text={label}
            x={x + 5}
            y={y + 6}
            width={Math.max(10, width - 10)}
            align="center"
            fontSize={Math.min(7, Math.max(5, width / 7))}
            fontStyle="bold"
            fill={kind === 'automation' ? '#0369A1' : SymbolColors.labelMuted}
            opacity={0.9}
            listening={false}
          />
        )}

        {(kind === 'meter' || kind === 'automation') && (
          <DisplayWindow
            x={x + width * 0.18}
            y={y + height * 0.36}
            width={width * 0.64}
            height={Math.min(16, height * 0.22)}
            text={kind === 'meter' ? 'LCD' : 'BUS'}
            active={energized}
          />
        )}

        {(kind === 'source' || kind === 'automation' || kind === 'mechanical') && (
          <VentSlots
            x={x + width - 18}
            y={y + Math.max(17, height * 0.38)}
            count={Math.min(5, Math.max(2, Math.floor(height / 14)))}
            width={12}
            gap={3}
          />
        )}

        {kind === 'protection' && (
          <Rect
            x={x + width / 2 - 8}
            y={y + height * 0.42}
            width={16}
            height={height * 0.28}
            fill={
              component.state === 'tripped'
                ? SymbolColors.trip
                : component.state === 'on'
                  ? SymbolColors.on
                  : SymbolColors.off
            }
            stroke="#475569"
            strokeWidth={0.7}
            cornerRadius={2}
            opacity={0.34}
            listening={false}
          />
        )}

        {kind === 'control' && (
          <StatusLed
            x={x + width - 8}
            y={y + 9}
            active={component.state === 'on' || energized}
            color={liveColor}
          />
        )}

        {kind === 'source' && (
          <>
            <StatusLed
              x={x + width - 8}
              y={y + 9}
              active
              color={liveColor}
            />
            <Text
              text={component.type === 'dc_power_source' ? '+  -' : '~'}
              x={x + 5}
              y={y + height - 12}
              fontSize={8}
              fontStyle="bold"
              fill={
                component.type === 'dc_power_source'
                  ? SymbolColors.dc
                  : SymbolColors.live
              }
              opacity={0.7}
              listening={false}
            />
          </>
        )}

        {kind === 'load' && (
          <Circle
            x={x + width - 10}
            y={y + height - 10}
            radius={5}
            fill={energized ? liveColor : '#CBD5E1'}
            opacity={energized ? 0.36 : 0.45}
            stroke="#64748B"
            strokeWidth={0.7}
            listening={false}
          />
        )}

        {kind === 'terminal' &&
          terminalPoints.map((cp, index) => (
            <TerminalPocket
              key={cp.id}
              x={cp.x}
              y={cp.y}
              leadToY={cp.y + (cp.y >= 0 ? 6 : -6)}
              width={7}
              height={5}
              label={String(index + 1)}
              labelY={cp.y >= 0 ? cp.y + 7 : cp.y - 13}
            />
          ))}

        {kind === 'automation' &&
          Array.from({ length: 4 }, (_, i) => (
            <StatusLed
              key={i}
              x={x + 8 + i * 7}
              y={y + height - 8}
              active={energized && i === 0}
              color={i === 0 ? SymbolColors.on : SymbolColors.comm}
            />
          ))}

        {(component.type === 'three_phase_source' ||
          component.type === 'three_phase_mcb' ||
          component.type === 'four_phase_mcb' ||
          component.type === 'three_phase_contactor' ||
          component.type === 'four_phase_contactor' ||
          component.type === 'three_phase_motor') &&
          ['L1', 'L2', 'L3', component.type.includes('four') ? 'N' : ''].filter(Boolean).map((phase, i) => (
            <PhaseTag
              key={phase}
              x={x + 10 + i * 13}
              y={y + height - 10}
              text={phase}
              color={phaseColors[i] ?? '#64748B'}
            />
          ))}

        {kind === 'busbar' &&
          Array.from({ length: Math.max(2, Math.min(8, Math.floor(width / 14))) }, (_, i) => (
            <Circle
              key={i}
              x={x + 8 + i * ((width - 16) / Math.max(1, Math.min(8, Math.floor(width / 14)) - 1))}
              y={y + height / 2}
              radius={2.2}
              fill="#F8FAFC"
              stroke="#475569"
              strokeWidth={0.6}
              opacity={0.8}
              listening={false}
            />
          ))}

        {kind === 'mechanical' && (
          <Line
            points={[x + 6, y + height - 8, x + width - 6, y + height - 8]}
            stroke="#94A3B8"
            strokeWidth={2}
            dash={[5, 3]}
            opacity={0.55}
            listening={false}
          />
        )}
      </ScaledSymbolInner>
    </Group>
  );
};

export default PhysicalSymbolSkin;
