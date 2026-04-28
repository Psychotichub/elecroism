import React, { useEffect, useState } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ThreePhaseMCBSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const DETAIL = 0.9;
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const is4P = component.type === 'four_phase_mcb';
  const poleXs = is4P ? [-30, -10, 10, 30] : [-20, 0, 20];
  const minX = Math.min(...poleXs) - 6;
  const maxX = Math.max(...poleXs) + 6;
  const bodyW = maxX - minX;

  useEffect(() => {
    if (!isTripped) return;
    const interval = setInterval(() => setFlashVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isTripped]);

  const handleColor = isTripped
    ? flashVisible
      ? '#EF4444'
      : '#7F1D1D'
    : isOn
      ? '#22C55E'
      : '#9CA3AF';

  const title =
    component.type === 'motor_protection_circuit_breaker'
      ? 'MPCB'
      : component.type === 'mccb'
        ? 'MCCB'
      : is4P
        ? '4P MCB'
        : '3P MCB';

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
        if (!isTripped) onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
      {selected && (
        <Rect
          x={minX - 4}
          y={-32}
          width={bodyW + 8}
          height={76}
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
        fillLinearGradientStartPoint={{ x: 0, y: -25 }}
        fillLinearGradientEndPoint={{ x: 0, y: 25 }}
        fillLinearGradientColorStops={
          energized
            ? [0, '#F8FAFC', 0.5, '#E2E8F0', 1, '#CBD5E1']
            : [0, '#E5E7EB', 1, '#CBD5E1']
        }
        stroke="#374151"
        strokeWidth={OUTLINE}
        cornerRadius={4}
        shadowColor="#0F172A"
        shadowBlur={4}
        shadowOpacity={0.2}
        shadowOffsetY={1}
      />
      <Rect
        x={minX + 2}
        y={-23}
        width={bodyW - 4}
        height={46}
        fill="#FFFFFF"
        opacity={0.16}
        cornerRadius={3}
        listening={false}
      />

      {poleXs.map((dx) => (
        <React.Fragment key={`term-pocket-${dx}`}>
          <Rect
            x={dx - 6}
            y={-30}
            width={12}
            height={6}
            fill="#D1D5DB"
            stroke="#6B7280"
            strokeWidth={DETAIL}
            cornerRadius={1.5}
            listening={false}
          />
          <Rect
            x={dx - 6}
            y={24}
            width={12}
            height={6}
            fill="#D1D5DB"
            stroke="#6B7280"
            strokeWidth={DETAIL}
            cornerRadius={1.5}
            listening={false}
          />
          <Circle x={dx} y={-27} radius={1.4} fill="#6B7280" listening={false} />
          <Circle x={dx} y={27} radius={1.4} fill="#6B7280" listening={false} />
        </React.Fragment>
      ))}

      {poleXs.map((dx) => (
        <Rect
          key={dx}
          x={dx - 4}
          y={-22}
          width={8}
          height={14}
          fill={handleColor}
          cornerRadius={2}
        />
      ))}
      {poleXs.map((dx) => (
        <Rect
          key={`pole-highlight-${dx}`}
          x={dx - 3}
          y={-21}
          width={6}
          height={3}
          fill="#F8FAFC"
          opacity={0.28}
          cornerRadius={1}
          listening={false}
        />
      ))}

      <Rect
        x={minX + 6}
        y={-2}
        width={bodyW - 12}
        height={3}
        fill="#334155"
        opacity={0.35}
        cornerRadius={2}
        listening={false}
      />

      <Text
        text={title}
        x={minX + 2}
        y={-6}
        width={bodyW - 4}
        fontSize={8}
        fill="#374151"
        fontStyle="bold"
        align="center"
        listening={false}
      />

      <Text
        text={`${component.properties.ratingAmps || 16}A`}
        x={minX + 4}
        y={6}
        fontSize={8}
        fill="#6B7280"
        listening={false}
      />

      {component.properties.tripCurve && (
        <Text
          text={component.properties.tripCurve}
          x={minX + bodyW - 16}
          y={6}
          fontSize={7}
          fill="#9CA3AF"
          listening={false}
        />
      )}

      {poleXs.map((dx) => (
        <React.Fragment key={`lead-${dx}`}>
          <Line
            points={[dx, -25, dx, -30]}
            stroke="#374151"
            strokeWidth={2}
          />
          <Line
            points={[dx, 25, dx, 30]}
            stroke="#374151"
            strokeWidth={2}
          />
        </React.Fragment>
      ))}

      {isTripped && (
        <Circle
          x={0}
          y={-16}
          radius={3}
          fill="#EF4444"
          opacity={flashVisible ? 1 : 0.3}
        />
      )}

      <ComponentCanvasLabel
          componentId={component.id}
        label={component.label}
        x={minX - 4}
        y={34}
        width={bodyW + 8}
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
      </ScaledSymbolInner>
    </Group>
  );
};

export default ThreePhaseMCBSymbol;
