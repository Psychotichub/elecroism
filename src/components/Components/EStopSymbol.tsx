import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import { ConnectionPointDots, SelectionFrame } from './SymbolPrimitives';
import { SymbolColors, SymbolMetrics } from './SymbolTokens';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onToggle?: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/** IEC-style e-stop: yellow base, red mushroom; `state === 'off'` = latched pressed. */
const EStopSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  onToggle,
  showConnectionPoints,
  selected,
}) => {
  const pressed = component.state === 'off';
  const energized = nodeResult?.energized || false;

  const headFill = pressed ? SymbolColors.tripDark : SymbolColors.trip;
  const headStroke = pressed ? '#450A0A' : '#7F1D1D';
  const placardFill = '#FACC15';

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
          <SelectionFrame x={-22} y={-26} width={44} height={52} />
        )}

        <Rect
          x={-20}
          y={-22}
          width={40}
          height={44}
          fill={placardFill}
          stroke="#A16207"
          strokeWidth={SymbolMetrics.stroke}
          cornerRadius={6}
          listening={false}
        />

        <Circle
          x={0}
          y={-2}
          radius={pressed ? 13 : 14}
          fill={headFill}
          stroke={headStroke}
          strokeWidth={2}
          shadowColor={energized ? SymbolColors.on : '#000'}
          shadowBlur={energized ? 3 : 2}
          shadowOpacity={pressed ? 0.35 : 0.2}
        />
        <Circle
          x={-4}
          y={-6}
          radius={4}
          fill="#FCA5A5"
          opacity={pressed ? 0.25 : 0.55}
          listening={false}
        />

        <Text
          text="STOP"
          x={-20}
          y={12}
          width={40}
          align="center"
          fontSize={7}
          fontStyle="bold"
          fill={SymbolColors.tripDark}
          listening={false}
        />

        <Line points={[0, -22, 0, -26]} stroke={SymbolColors.bodyStroke} strokeWidth={2} />
        <Line points={[0, 22, 0, 26]} stroke={SymbolColors.bodyStroke} strokeWidth={2} />

        {pressed && (
          <Text
            text="LATCHED"
            x={-26}
            y={-34}
            width={52}
            align="center"
            fontSize={7}
            fontStyle="bold"
            fill={SymbolColors.trip}
            listening={false}
          />
        )}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-30}
          y={30}
          width={60}
          fontSize={component.properties.labelFontSize ?? 8}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

        {showConnectionPoints && (
          <ConnectionPointDots connectionPoints={component.connectionPoints} />
        )}
      </ScaledSymbolInner>
    </Group>
  );
};

export default EStopSymbol;
