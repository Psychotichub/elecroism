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

const MCBSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;

  const is2P =
    component.properties.poles === 2 ||
    component.connectionPoints.some((cp) =>
      cp.label.toUpperCase().includes('IN_L')
    );

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

  const bodyW = is2P ? 30 : 28;
  const bodyH = 50;
  const selPadX = is2P ? 4 : 4;
  const selPadY = 4;
  const labelBand = 12;

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
          x={-bodyW / 2 - selPadX}
          y={-bodyH / 2 - selPadY - 4}
          width={bodyW + selPadX * 2}
          height={bodyH + selPadY * 2 + 8 + labelBand}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={-bodyW / 2}
        y={-bodyH / 2}
        width={bodyW}
        height={bodyH}
        fill={energized ? '#F3F4F6' : '#E5E7EB'}
        stroke="#374151"
        strokeWidth={1.5}
        cornerRadius={4}
      />

      {is2P ? (
        <>
          <Rect
            x={-11}
            y={-22}
            width={8}
            height={16}
            fill={handleColor}
            cornerRadius={2}
          />
          <Rect
            x={3}
            y={-22}
            width={8}
            height={16}
            fill={handleColor}
            cornerRadius={2}
          />
          <Text
            text="L"
            x={-11}
            y={-4}
            width={8}
            align="center"
            fontSize={7}
            fill="#6B7280"
            listening={false}
          />
          <Text
            text="N"
            x={3}
            y={-4}
            width={8}
            align="center"
            fontSize={7}
            fill="#6B7280"
            listening={false}
          />
        </>
      ) : (
        <Rect
          x={-5}
          y={-22}
          width={10}
          height={16}
          fill={handleColor}
          cornerRadius={2}
        />
      )}

      <Text
        text="MCB"
        x={-12}
        y={is2P ? 6 : -2}
        width={24}
        align="center"
        fontSize={8}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text={`${component.properties.ratingAmps || 16}A`}
        x={-12}
        y={is2P ? 16 : 8}
        width={24}
        align="center"
        fontSize={8}
        fill="#6B7280"
        listening={false}
      />

      {component.properties.tripCurve && (
        <Text
          text={component.properties.tripCurve}
          x={-10}
          y={is2P ? 26 : 16}
          fontSize={7}
          fill="#9CA3AF"
          listening={false}
        />
      )}

      {is2P ? (
        <>
          <Line points={[-10, -25, -10, -30]} stroke="#374151" strokeWidth={2} />
          <Line points={[-10, 25, -10, 30]} stroke="#374151" strokeWidth={2} />
          <Line points={[10, -25, 10, -30]} stroke="#374151" strokeWidth={2} />
          <Line points={[10, 25, 10, 30]} stroke="#374151" strokeWidth={2} />
        </>
      ) : (
        <>
          <Line points={[0, -25, 0, -30]} stroke="#374151" strokeWidth={2} />
          <Line points={[0, 25, 0, 30]} stroke="#374151" strokeWidth={2} />
        </>
      )}

      {isTripped && (
        <Circle
          x={is2P ? -6 : 0}
          y={-18}
          radius={3}
          fill="#EF4444"
          opacity={flashVisible ? 1 : 0.3}
        />
      )}

      <ComponentCanvasLabel
          componentId={component.id}
        label={component.label}
        x={-bodyW / 2 - 10}
        y={32}
        width={bodyW + 20}
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

export default MCBSymbol;
