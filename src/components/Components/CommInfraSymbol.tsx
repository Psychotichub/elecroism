import React from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const CommInfraSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const energized = nodeResult?.energized || false;
  const title =
    component.type === 'relay_interface_card'
      ? 'RELAY IF'
      : component.type === 'modbus_rtu_module'
        ? 'MB RTU'
      : component.type === 'iot_gateway'
        ? 'IOT GW'
      : component.type === 'cloud_monitoring_module'
        ? 'CLOUD MON'
      : component.type === 'energy_management_controller'
        ? 'EMC'
      : component.type === 'communication_converter'
        ? 'COMM CVT'
        : 'ETH SW';
  const subtitle =
    component.type === 'relay_interface_card'
      ? `${component.properties.ioChannels ?? 8} ch`
      : component.type === 'modbus_rtu_module'
        ? 'RS485 A/B'
      : component.type === 'iot_gateway'
        ? `${component.properties.gatewayIp ?? '10.10.10.10'}:${component.properties.gatewayPort ?? 8883}`
      : component.type === 'cloud_monitoring_module'
        ? `${component.properties.gatewayIp ?? 'cloud.bms.local'}:${component.properties.gatewayPort ?? 443}`
      : component.type === 'energy_management_controller'
        ? `${component.properties.ioChannels ?? 16} pts`
      : component.type === 'communication_converter'
        ? `${component.properties.gatewayIp ?? '192.168.1.120'}:${component.properties.gatewayPort ?? 502}`
        : `${component.properties.ioChannels ?? 5} ports`;

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Rect
            x={-34}
            y={-26}
            width={68}
            height={52}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-30}
          y={-22}
          width={60}
          height={44}
          fillLinearGradientStartPoint={{ x: 0, y: -22 }}
          fillLinearGradientEndPoint={{ x: 0, y: 22 }}
          fillLinearGradientColorStops={
            energized
              ? [0, '#F8FAFC', 0.55, '#E0F2FE', 1, '#BFDBFE']
              : [0, '#F8FAFC', 1, '#E5E7EB']
          }
          stroke={energized ? '#0369A1' : '#6B7280'}
          strokeWidth={OUTLINE}
          cornerRadius={4}
          shadowColor="#0F172A"
          shadowBlur={4}
          shadowOpacity={0.2}
          shadowOffsetY={1}
        />
        <Text
          text={title}
          x={-28}
          y={-14}
          width={56}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#0C4A6E"
          listening={false}
        />
        <Text
          text={subtitle}
          x={-28}
          y={-2}
          width={56}
          align="center"
          fontSize={7}
          fill="#475569"
          listening={false}
        />
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-34}
          y={28}
          width={68}
          fontSize={component.properties.labelFontSize ?? 8}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {showConnectionPoints &&
          component.connectionPoints.map((cp) => (
            <Circle
              key={cp.id}
              x={cp.x}
              y={cp.y}
            radius={4.5}
              fill="#3B82F6"
            opacity={0.7}
              stroke="#2563EB"
            strokeWidth={1.2}
            />
          ))}
        {component.connectionPoints.map((cp) => (
          <Text
            key={`${cp.id}-term-label`}
            text={cp.label}
            x={cp.x - 14}
            y={cp.y + 7}
            width={28}
            fontSize={6}
            fill="#334155"
            align="center"
            listening={false}
          />
        ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default CommInfraSymbol;

