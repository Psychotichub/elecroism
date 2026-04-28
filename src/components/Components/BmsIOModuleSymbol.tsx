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

const BmsIOModuleSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const kind =
    component.type === 'di_module'
      ? 'DI'
      : component.type === 'do_module'
        ? 'DO'
        : component.type === 'ao_module'
          ? 'AO'
          : 'AI';
  const ioText =
    kind === 'AI'
      ? `${component.properties.ioChannels ?? 4}ch ${component.properties.aiSignalType === '0_10v' ? '0-10V' : '4-20mA'}`
      : kind === 'AO'
        ? `${component.properties.ioChannels ?? 4}ch ${component.properties.aoSignalType === '0_10v' ? '0-10V' : '4-20mA'}`
      : `${component.properties.ioChannels ?? 4}ch`;

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
          fill={energized ? '#E0F2FE' : '#F3F4F6'}
          stroke={energized ? '#0284C7' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Text
          text={`BMS ${kind}`}
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
          text={ioText}
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

export default BmsIOModuleSymbol;

