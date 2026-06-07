import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import { coilTerminalTag } from '../../utils/coilTerminalTag';
import { getCanvasInteractionColors } from '../../design/canvasInteractionColors';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/**
 * Interposing (interface) relay: small footprint relay used to translate a
 * 24 V DC BMS digital output into a contact suitable for a contactor coil or
 * larger control circuit. Coil A1/A2 picked up → IN/OUT NO contact closes.
 */
const InterposingRelaySymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const isOn = component.state === 'on';
  const simEnergized = nodeResult?.energized ?? false;
  const coilV = component.properties.relayCoilVoltage ?? 24;

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
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Rect
            x={-22}
            y={-26}
            width={44}
            height={52}
            stroke={getCanvasInteractionColors().selection}
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        <Rect
          x={-18}
          y={-22}
          width={36}
          height={44}
          fill={isOn ? '#DBEAFE' : '#F9FAFB'}
          stroke={isOn ? '#1D4ED8' : '#374151'}
          strokeWidth={1.5}
          cornerRadius={4}
        />

        <Rect
          x={-12}
          y={-6}
          width={24}
          height={14}
          fill="transparent"
          stroke="#374151"
          strokeWidth={1}
        />
        <Text
          text="K-IF"
          x={-12}
          y={-4}
          width={24}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill={isOn ? '#1D4ED8' : '#374151'}
          listening={false}
        />

        <Circle
          x={10}
          y={-15}
          radius={3}
          fill={simEnergized || isOn ? '#22C55E' : '#9CA3AF'}
          stroke={simEnergized || isOn ? '#14532D' : undefined}
          strokeWidth={simEnergized || isOn ? 0.6 : 0}
        />

        <Line points={[0, -22, 0, -26]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, 22, 0, 26]} stroke="#374151" strokeWidth={2} />
        <Line points={[-18, 0, -22, 0]} stroke="#374151" strokeWidth={1.5} />
        <Line points={[18, 0, 22, 0]} stroke="#374151" strokeWidth={1.5} />

        <Text
          text={`${coilV} V DC`}
          x={-22}
          y={11}
          width={44}
          align="center"
          fontSize={6}
          fill="#6B7280"
          listening={false}
        />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-26}
          y={28}
          width={52}
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

        {component.connectionPoints.map((cp) => {
          const tag = coilTerminalTag(cp.label);
          if (!tag) return null;
          return (
            <Text
              key={`${cp.id}-coil-tag`}
              text={tag}
              x={cp.x - 11}
              y={cp.y - 14}
              width={22}
              fontSize={8}
              fontStyle="bold"
              fill="#111827"
              align="center"
              listening={false}
            />
          );
        })}

      </ScaledSymbolInner>
    </Group>
  );
};

export default InterposingRelaySymbol;
