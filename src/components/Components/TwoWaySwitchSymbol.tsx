import React from 'react';
import { Group, Circle, Line, Text, Rect } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

/** Match {@link SwitchSymbol} — `component_symbol.md` (stroke, body, terminals, labels). */
const STROKE = 2;
const OUTLINE = 1.5;
const R_TERM = 4;

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  /** Double-click on canvas: flip COM–T1 vs COM–T2 */
  onToggle?: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/**
 * Single-pole two-way (SPDT) maintained switch: COM common, throws to T1 or T2.
 * Simulation: `state === 'on'` → COM–T1; `state === 'off'` → COM–T2.
 * Wire attach points: COM (0,20), T1 (-14,-20), T2 (14,-20) — `createConnectionPoints`.
 */
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
  const color = energized ? '#F59E0B' : '#374151';
  const bodyStroke = energized ? '#D97706' : '#D1D5DB';
  const muted = '#9CA3AF';
  const toT1 = component.state === 'on';

  const com = { x: 0, y: 14 };
  const hub = { x: 0, y: -2 };
  const t1 = { x: -14, y: -14 };
  const t2 = { x: 14, y: -14 };

  const fillCom = energized ? '#FEF3C7' : '#F3F4F6';
  const fillT1 = toT1 ? '#FEF3C7' : '#F3F4F6';
  const fillT2 = !toT1 ? '#FEF3C7' : '#F3F4F6';

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
      onDblClick={(e) => {
        e.cancelBubble = true;
        onToggle?.();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Line
            points={[-22, -28, 22, -28, 22, 30, -22, 30]}
            closed
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
          />
        )}

        <Rect
          x={-20}
          y={-26}
          width={40}
          height={54}
          cornerRadius={4}
          stroke={bodyStroke}
          strokeWidth={1}
          fill={energized ? 'rgba(254,243,199,0.35)' : 'rgba(249,250,251,0.9)'}
          listening={false}
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

        <Circle
          x={com.x}
          y={com.y}
          radius={R_TERM}
          fill={fillCom}
          stroke={color}
          strokeWidth={OUTLINE}
        />
        <Circle
          x={t1.x}
          y={t1.y}
          radius={R_TERM}
          fill={fillT1}
          stroke={color}
          strokeWidth={OUTLINE}
        />
        <Circle
          x={t2.x}
          y={t2.y}
          radius={R_TERM}
          fill={fillT2}
          stroke={color}
          strokeWidth={OUTLINE}
        />

        <Line
          points={[com.x, com.y + 3, com.x, 20]}
          stroke={color}
          strokeWidth={STROKE}
          lineCap="round"
        />
        <Line
          points={[t1.x, t1.y - 2, t1.x, -20]}
          stroke={color}
          strokeWidth={STROKE}
          lineCap="round"
        />
        <Line
          points={[t2.x, t2.y - 2, t2.x, -20]}
          stroke={color}
          strokeWidth={STROKE}
          lineCap="round"
        />

        <Circle x={hub.x} y={hub.y} radius={2} fill={color} listening={false} />

        {energized && (
          <Circle
            x={com.x}
            y={com.y}
            radius={7}
            fill="#F59E0B"
            opacity={0.22}
            listening={false}
          />
        )}

        <Text
          text="T1"
          x={t1.x - 12}
          y={-30}
          width={24}
          align="center"
          fontSize={6}
          fontStyle="bold"
          fill="#6B7280"
          listening={false}
        />
        <Text
          text="T2"
          x={t2.x - 12}
          y={-30}
          width={24}
          align="center"
          fontSize={6}
          fontStyle="bold"
          fill="#6B7280"
          listening={false}
        />
        <Text
          text="COM"
          x={-12}
          y={24}
          width={24}
          align="center"
          fontSize={6}
          fontStyle="bold"
          fill="#6B7280"
          listening={false}
        />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={16}
          y={-8}
          width={112}
          fontSize={component.properties.labelFontSize ?? 9}
          fill="#6B7280"
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        <Text
          text={toT1 ? 'COM–T1' : 'COM–T2'}
          x={16}
          y={4}
          fontSize={8}
          fill={toT1 ? '#22C55E' : '#0EA5E9'}
          listening={false}
        />
        <Text
          text="SPDT"
          x={16}
          y={14}
          fontSize={7}
          fill="#9CA3AF"
          listening={false}
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
      </ScaledSymbolInner>
    </Group>
  );
};

export default TwoWaySwitchSymbol;
