import React from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import {
  ConnectionPointDots,
  DeviceBody,
  SelectionFrame,
  TerminalPocket,
} from './SymbolPrimitives';
import { SymbolColors } from './SymbolTokens';

const STROKE = 2;

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle?: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/** SPDT two-way: COM (bottom), T1 / T2 top — matches `createConnectionPoints`. */
const TwoWaySwitchSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const color = energized ? SymbolColors.live : SymbolColors.bodyStroke;
  const muted = SymbolColors.labelMuted;
  const toT1 = component.state === 'on';

  const com = { x: 0, y: 14 };
  const hub = { x: 0, y: -2 };
  const t1 = { x: -14, y: -14 };
  const t2 = { x: 14, y: -14 };

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      data-component-id={component.id}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onToggle?.();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <SelectionFrame x={-22} y={-28} width={44} height={58} />
        )}

        <DeviceBody
          x={-20}
          y={-26}
          width={40}
          height={54}
          energized={energized}
        />

        <TerminalPocket
          x={com.x}
          y={com.y - 2}
          leadToY={20}
          label="COM"
          labelY={26}
        />
        <TerminalPocket
          x={t1.x}
          y={t1.y + 2}
          leadToY={-20}
          label="T1"
          labelY={-32}
        />
        <TerminalPocket
          x={t2.x}
          y={t2.y + 2}
          leadToY={-20}
          label="T2"
          labelY={-32}
        />

        <Line
          points={[com.x, com.y, hub.x, hub.y]}
          stroke={color}
          strokeWidth={STROKE}
          lineCap="round"
        />
        <Line
          points={[hub.x, hub.y, t1.x, t1.y]}
          stroke={toT1 ? color : muted}
          strokeWidth={toT1 ? STROKE + 0.25 : 1}
          opacity={toT1 ? 1 : 0.45}
          dash={toT1 ? undefined : [3, 3]}
          lineCap="round"
        />
        <Line
          points={[hub.x, hub.y, t2.x, t2.y]}
          stroke={!toT1 ? color : muted}
          strokeWidth={!toT1 ? STROKE + 0.25 : 1}
          opacity={!toT1 ? 1 : 0.45}
          dash={!toT1 ? undefined : [3, 3]}
          lineCap="round"
        />

        <Circle x={hub.x} y={hub.y} radius={2} fill={color} listening={false} />

        {energized && (
          <Circle
            x={com.x}
            y={com.y}
            radius={7}
            fill={SymbolColors.live}
            opacity={0.2}
            listening={false}
          />
        )}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={16}
          y={-8}
          width={112}
          fontSize={component.properties.labelFontSize ?? 9}
          fill={SymbolColors.labelMuted}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        <Text
          text={toT1 ? 'COM–T1' : 'COM–T2'}
          x={16}
          y={4}
          fontSize={8}
          fill={toT1 ? SymbolColors.on : SymbolColors.comm}
          listening={false}
        />
        <Text
          text="SPDT"
          x={16}
          y={14}
          fontSize={7}
          fill={SymbolColors.labelMuted}
          listening={false}
        />

        {showConnectionPoints && (
          <ConnectionPointDots connectionPoints={component.connectionPoints} />
        )}
      </ScaledSymbolInner>
    </Group>
  );
};

export default TwoWaySwitchSymbol;
