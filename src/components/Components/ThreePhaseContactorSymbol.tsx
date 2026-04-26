import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';

function coilTerminalTag(label: string): 'A1' | 'A2' | null {
  const u = label.toUpperCase();
  if (u === 'A1' || u === 'COIL_A') return 'A1';
  if (u === 'A2' || u === 'COIL_B') return 'A2';
  return null;
}

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ThreePhaseContactorSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const is4P = component.type === 'four_phase_contactor';
  const poleXs = is4P ? [-30, -10, 10, 30] : [-20, 0, 20];
  const poleColors = is4P
    ? ['#7C3F19', '#111827', '#4B5563', '#2563EB']
    : ['#7C3F19', '#111827', '#4B5563'];
  const minX = Math.min(...poleXs) - 6;
  const maxX = Math.max(...poleXs) + 6;
  const bodyW = maxX - minX;
  const coilAX = is4P ? -44 : -36;
  const coilBX = is4P ? 44 : 36;
  const title = is4P ? '4P KM' : '3P KM';

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
          x={minX - 4}
          y={-32}
          width={bodyW + 8}
          height={64}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={minX}
        y={-25}
        width={bodyW}
        height={50}
        fill={energized ? '#F0FDF4' : '#F3F4F6'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={4}
      />

      <Rect
        x={minX + 4}
        y={-10}
        width={bodyW - 8}
        height={18}
        fill="transparent"
        stroke="#374151"
        strokeWidth={1}
      />

      <Text
        text={title}
        x={minX + 2}
        y={-8}
        width={bodyW - 4}
        fontSize={9}
        fill="#374151"
        fontStyle="bold"
        align="center"
        listening={false}
      />

      <Circle
        x={minX + bodyW - 10}
        y={-18}
        radius={3}
        fill={isOn ? '#22C55E' : '#9CA3AF'}
      />

      <Text
        text={component.label}
        x={minX}
        y={14}
        width={bodyW}
        fontSize={7}
        fill="#6B7280"
        align="center"
        listening={false}
      />

      {poleXs.map((dx, i) => (
        <React.Fragment key={dx}>
          <Line
            points={[dx, -25, dx, -30]}
            stroke={poleColors[i]}
            strokeWidth={2}
          />
          <Line
            points={[dx, 25, dx, 30]}
            stroke={poleColors[i]}
            strokeWidth={2}
          />
        </React.Fragment>
      ))}

      <Line
        points={[minX, 0, coilAX, 0]}
        stroke="#374151"
        strokeWidth={1.5}
      />
      <Line
        points={[maxX, 0, coilBX, 0]}
        stroke="#374151"
        strokeWidth={1.5}
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

      {component.connectionPoints.map((cp) => {
        const tag = coilTerminalTag(cp.label);
        if (!tag) return null;
        return (
          <Text
            key={`${cp.id}-coil-tag`}
            text={tag}
            x={cp.x - 11}
            y={cp.y - 16}
            width={22}
            fontSize={9}
            fill="#111827"
            fontStyle="bold"
            align="center"
            listening={false}
          />
        );
      })}
      </ScaledSymbolInner>
    </Group>
  );
};

export default ThreePhaseContactorSymbol;
