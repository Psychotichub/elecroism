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
  onReset: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const BreakerSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  onReset,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const DETAIL = 0.9;
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const isRcdLike =
    component.type === 'rcd' ||
    component.type === 'residual_current_circuit_breaker';
  const poles = component.properties.poles ?? 2;
  const poleXs =
    isRcdLike && poles >= 4 ? [-24, -8, 8, 24] : isRcdLike ? [-14, 14] : [0];
  const bodyWidth = isRcdLike && poles >= 4 ? 76 : 50;
  const bodyX = -bodyWidth / 2;
  const selWidth = bodyWidth + 8;
  const selX = -selWidth / 2;

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
    component.type === 'residual_current_circuit_breaker'
      ? 'RCCB'
      : component.type === 'rcd'
        ? 'RCD'
        : 'BRK';
  const rcdType = component.properties.rcdType ?? 'A';
  const rcdTripMs = component.properties.rcdTripTimeMs ?? 30;

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
        if (isTripped) {
          onReset();
        } else {
          onToggle();
        }
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
      {selected && (
        <Rect
          x={selX}
          y={-30}
          width={selWidth}
          height={60}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={bodyX}
        y={-26}
        width={bodyWidth}
        height={52}
        fillLinearGradientStartPoint={{ x: 0, y: -26 }}
        fillLinearGradientEndPoint={{ x: 0, y: 26 }}
        fillLinearGradientColorStops={
          energized
            ? [0, '#F8FAFC', 0.55, '#E5E7EB', 1, '#CBD5E1']
            : [0, '#E5E7EB', 1, '#CBD5E1']
        }
        stroke="#374151"
        strokeWidth={OUTLINE}
        cornerRadius={3}
        shadowColor="#0F172A"
        shadowBlur={4}
        shadowOpacity={0.22}
        shadowOffsetY={1.2}
      />
      <Rect
        x={bodyX + 2}
        y={-24}
        width={bodyWidth - 4}
        height={48}
        fill="#FFFFFF"
        opacity={0.14}
        cornerRadius={2}
        listening={false}
      />

      {poleXs.map((x) => (
        <React.Fragment key={`term-${x}`}>
          <Rect
            x={x - 3}
            y={-30}
            width={6}
            height={6}
            fill="#D1D5DB"
            stroke="#6B7280"
            strokeWidth={DETAIL}
            cornerRadius={1.2}
            listening={false}
          />
          <Rect
            x={x - 3}
            y={24}
            width={6}
            height={6}
            fill="#D1D5DB"
            stroke="#6B7280"
            strokeWidth={DETAIL}
            cornerRadius={1.2}
            listening={false}
          />
          <Circle x={x} y={-27} radius={1.15} fill="#6B7280" listening={false} />
          <Circle x={x} y={27} radius={1.15} fill="#6B7280" listening={false} />
          <Line points={[x, -26, x, -30]} stroke="#374151" strokeWidth={1.7} />
          <Line points={[x, 26, x, 30]} stroke="#374151" strokeWidth={1.7} />
        </React.Fragment>
      ))}

      <Rect
        x={-5}
        y={-23}
        width={10}
        height={14}
        fill={handleColor}
        cornerRadius={2}
      />
      <Rect
        x={-4}
        y={-22}
        width={8}
        height={3}
        fill="#F8FAFC"
        opacity={0.28}
        cornerRadius={1}
        listening={false}
      />
      <Line
        points={[-3, -16, 3, -16]}
        stroke="#111827"
        opacity={0.35}
        strokeWidth={1}
        listening={false}
      />

      <Text
        text={title}
        x={-10}
        y={-5}
        fontSize={9}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text={`${component.properties.rcdSensitivity || 30}mA`}
        x={-12}
        y={6}
        fontSize={7}
        fill="#6B7280"
        listening={false}
      />
      {(component.type === 'rcd' ||
        component.type === 'residual_current_circuit_breaker') && (
        <Text
          text={`T${rcdType} ${rcdTripMs}ms`}
          x={-15}
          y={13}
          width={30}
          align="center"
          fontSize={6}
          fill="#4B5563"
          listening={false}
        />
      )}

      <Circle
        x={0}
        y={18}
        radius={4}
        fill="#D1D5DB"
        stroke="#9CA3AF"
        strokeWidth={1}
      />
      <Text
        text="T"
        x={-3}
        y={14}
        fontSize={6}
        fill="#6B7280"
        listening={false}
      />

      <ComponentCanvasLabel
          componentId={component.id}
        label={component.label}
        x={-26}
        y={34}
        width={52}
        fontSize={component.properties.labelFontSize ?? 7}
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

export default BreakerSymbol;
