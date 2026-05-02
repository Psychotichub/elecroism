import React from 'react';
import { Group, Circle, Line, Rect, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  /** Single click latches/unlatches the mushroom head (state toggles). */
  onToggle?: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const EStopSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  onToggle,
  showConnectionPoints,
  selected,
}) => {
  // state === 'on' means the NC contact is closed (head NOT pressed).
  // state === 'off' means latched / pressed → IN-OUT path is open.
  const pressed = component.state === 'off';
  const energized = nodeResult?.energized || false;

  const headFill = pressed ? '#7F1D1D' : '#DC2626';
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
          <Rect
            x={-22}
            y={-26}
            width={44}
            height={52}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={6}
          />
        )}

        <Rect
          x={-20}
          y={-22}
          width={40}
          height={44}
          fill={placardFill}
          stroke="#A16207"
          strokeWidth={1.5}
          cornerRadius={6}
        />

        <Circle
          x={0}
          y={-2}
          radius={pressed ? 13 : 14}
          fill={headFill}
          stroke={headStroke}
          strokeWidth={2}
          shadowColor={energized ? '#22C55E' : '#000'}
          shadowBlur={energized ? 4 : 2}
          shadowOpacity={pressed ? 0.4 : 0.25}
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
          fill="#7F1D1D"
          listening={false}
        />

        <Line
          points={[0, -22, 0, -26]}
          stroke="#374151"
          strokeWidth={2}
        />
        <Line
          points={[0, 22, 0, 26]}
          stroke="#374151"
          strokeWidth={2}
        />

        {pressed && (
          <Text
            text="LATCHED"
            x={-26}
            y={-34}
            width={52}
            align="center"
            fontSize={7}
            fontStyle="bold"
            fill="#B91C1C"
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
            fill="#374151"
            align="center"
            listening={false}
          />
        ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default EStopSymbol;
