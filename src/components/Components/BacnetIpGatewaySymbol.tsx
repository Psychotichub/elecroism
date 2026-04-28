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

const BacnetIpGatewaySymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const ip = component.properties.gatewayIp ?? '192.168.1.110';
  const port = component.properties.gatewayPort ?? 47808;
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
          fill={energized ? '#EDE9FE' : '#F3F4F6'}
          stroke={energized ? '#6D28D9' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Text text="BACNET/IP" x={-28} y={-16} width={56} align="center" fontSize={8} fill="#4C1D95" fontStyle="bold" listening={false} />
        <Text text={ip} x={-28} y={-4} width={56} align="center" fontSize={7} fill="#374151" listening={false} />
        <Text text={`:${port}`} x={-28} y={6} width={56} align="center" fontSize={7} fill="#6B7280" listening={false} />
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-34} y={28} width={68}           fontSize={component.properties.labelFontSize ?? 8}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {showConnectionPoints &&
          component.connectionPoints.map((cp) => (
            <Circle
              key={cp.id}
              x={cp.x}
              y={cp.y}
              radius={5}
              fill="#3B82F6"
              opacity={0.6}
              stroke="#2563EB"
              strokeWidth={1}
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

export default BacnetIpGatewaySymbol;

