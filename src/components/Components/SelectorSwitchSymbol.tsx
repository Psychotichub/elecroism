import React from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
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
  /** Click cycles OFF → AUTO → MANUAL → OFF. */
  onCycle?: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/**
 * Three-position rotary selector: COM at the top, AUTO bottom-left, MANUAL
 * bottom-right. The pointer rotates based on `properties.selectorPosition`:
 *  - OFF      : pointer up (no contact)
 *  - AUTO     : pointer down-left
 *  - MANUAL   : pointer down-right
 */
const SelectorSwitchSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  onCycle,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const position = component.properties.selectorPosition ?? 'OFF';
  const pointerAngle =
    position === 'AUTO' ? 135 : position === 'MANUAL' ? 45 : -90;
  const rad = (pointerAngle * Math.PI) / 180;
  const px = Math.cos(rad) * 11;
  const py = Math.sin(rad) * 11;

  const dialFill = energized ? '#FEF3C7' : '#F3F4F6';
  const dialStroke = energized ? '#B45309' : '#374151';

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
        onCycle?.();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <SelectionFrame x={-24} y={-28} width={48} height={56} />
        )}

        <Circle
          x={0}
          y={0}
          radius={16}
          fillRadialGradientStartPoint={{ x: -4, y: -5 }}
          fillRadialGradientStartRadius={2}
          fillRadialGradientEndPoint={{ x: 0, y: 0 }}
          fillRadialGradientEndRadius={16}
          fillRadialGradientColorStops={
            energized
              ? [0, '#FFFBEB', 1, dialFill]
              : [0, '#F8FAFC', 1, dialFill]
          }
          stroke={dialStroke}
          strokeWidth={SymbolMetrics.stroke}
          shadowColor={energized ? SymbolColors.live : undefined}
          shadowBlur={energized ? 4 : 0}
        />
        <Circle
          x={0}
          y={0}
          radius={12.5}
          stroke="#6B7280"
          strokeWidth={0.8}
          opacity={0.55}
          listening={false}
        />

        <Line
          points={[0, 0, px, py]}
          stroke={dialStroke}
          strokeWidth={2.5}
          lineCap="round"
        />
        <Circle x={0} y={0} radius={2.2} fill={dialStroke} />
        <Circle
          x={0}
          y={0}
          radius={1.1}
          fill={SymbolColors.faceplate}
          listening={false}
        />

        <Text
          text="OFF"
          x={-12}
          y={-22}
          width={24}
          align="center"
          fontSize={7}
          fontStyle="bold"
          fill={
            position === 'OFF' ? SymbolColors.label : SymbolColors.labelMuted
          }
          listening={false}
        />
        <Text
          text="AUTO"
          x={-26}
          y={14}
          width={20}
          align="left"
          fontSize={7}
          fontStyle="bold"
          fill={position === 'AUTO' ? SymbolColors.on : SymbolColors.labelMuted}
          listening={false}
        />
        <Text
          text="MAN"
          x={6}
          y={14}
          width={20}
          align="right"
          fontSize={7}
          fontStyle="bold"
          fill={
            position === 'MANUAL' ? SymbolColors.comm : SymbolColors.labelMuted
          }
          listening={false}
        />

        <Line
          points={[0, -16, 0, -22]}
          stroke={SymbolColors.bodyStroke}
          strokeWidth={2}
        />
        <Line
          points={[-16, 22, -16, 14]}
          stroke={SymbolColors.bodyStroke}
          strokeWidth={2}
        />
        <Line
          points={[16, 22, 16, 14]}
          stroke={SymbolColors.bodyStroke}
          strokeWidth={2}
        />

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

export default SelectorSwitchSymbol;
