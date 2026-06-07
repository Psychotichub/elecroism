import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import type { CircuitComponent, NodeResult, WireColor } from '../../types';
import { getWireColor } from '../../utils/geometry';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';
import { getCanvasInteractionColors } from '../../design/canvasInteractionColors';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
  effectiveWireColor?: WireColor;
  onExtendLeft?: () => void;
  onExtendRight?: () => void;
  onShrinkLeft?: () => void;
  onShrinkRight?: () => void;
}

const BusbarSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
  effectiveWireColor,
  onExtendLeft,
  onExtendRight,
  onShrinkLeft,
  onShrinkRight,
}) => {
  const OUTLINE = 1.6;
  const tapXs =
    component.connectionPoints.length > 0
      ? component.connectionPoints.map((cp) => cp.x).sort((a, b) => a - b)
      : [-50, -30, -10, 10, 30, 50];
  const minTapX = tapXs[0];
  const maxTapX = tapXs[tapXs.length - 1];
  const barPad = 10;
  const barX = minTapX - barPad;
  const barWidth = Math.max(60, maxTapX - minTapX + barPad * 2);
  const selectPad = 4;
  const selectionX = barX - selectPad;
  const selectionW = barWidth + selectPad * 2;
  const energized = nodeResult?.energized || false;
  const configuredColor = getWireColor(
    effectiveWireColor || component.properties.wireColor || 'brown'
  );
  const barColor = energized ? configuredColor : '#9CA3AF';
  const barStroke = energized ? '#374151' : '#6B7280';
  const controlY = -18;
  const leftMinusX = barX - 30;
  const leftPlusX = barX - 16;
  const rightPlusX = barX + barWidth + 4;
  const rightMinusX = barX + barWidth + 18;

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
          x={selectionX}
          y={-8}
          width={selectionW}
          height={16}
          stroke={getCanvasInteractionColors().selection}
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={2}
        />
      )}

      <Rect
        x={barX}
        y={-4}
        width={barWidth}
        height={8}
        fillLinearGradientStartPoint={{ x: barX, y: 0 }}
        fillLinearGradientEndPoint={{ x: barX + barWidth, y: 0 }}
        fillLinearGradientColorStops={
          energized
            ? [0, barColor, 0.5, '#F8FAFC', 1, barColor]
            : [0, '#9CA3AF', 1, '#6B7280']
        }
        stroke={barStroke}
        strokeWidth={OUTLINE}
        cornerRadius={2}
        shadowColor={energized ? configuredColor : undefined}
        shadowBlur={energized ? 8 : 0}
        opacity={1}
      />
      {tapXs.map((sx) => (
        <Circle
          key={`bar-bolt-${sx}`}
          x={sx}
          y={0}
          radius={1.5}
          fill="#475569"
          listening={false}
        />
      ))}

      <ComponentCanvasLabel
          componentId={component.id}
        label={component.label}
        x={barX}
        y={-16}
        width={barWidth}
        fontSize={component.properties.labelFontSize ?? 8}
        offsetX={component.properties.labelOffsetX ?? 0}
        offsetY={component.properties.labelOffsetY ?? 0}
      />

      {selected && (
        <>
          <Group
            x={leftMinusX}
            y={controlY}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect();
              onShrinkLeft?.();
            }}
          >
            <Rect
              x={0}
              y={0}
              width={12}
              height={12}
              cornerRadius={2}
              fill="#475569"
              stroke="#334155"
              strokeWidth={1}
            />
            <Text
              x={3.6}
              y={0.4}
              text="-"
              fill="#FFFFFF"
              fontSize={10}
              fontStyle="bold"
              listening={false}
            />
          </Group>
          <Group
            x={leftPlusX}
            y={controlY}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect();
              onExtendLeft?.();
            }}
          >
            <Rect
              x={0}
              y={0}
              width={12}
              height={12}
              cornerRadius={2}
              fill="#2563EB"
              stroke="#1D4ED8"
              strokeWidth={1}
            />
            <Text
              x={2.8}
              y={0.5}
              text="+"
              fill="#FFFFFF"
              fontSize={10}
              fontStyle="bold"
              listening={false}
            />
          </Group>
          <Group
            x={rightPlusX}
            y={controlY}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect();
              onExtendRight?.();
            }}
          >
            <Rect
              x={0}
              y={0}
              width={12}
              height={12}
              cornerRadius={2}
              fill="#2563EB"
              stroke="#1D4ED8"
              strokeWidth={1}
            />
            <Text
              x={2.8}
              y={0.5}
              text="+"
              fill="#FFFFFF"
              fontSize={10}
              fontStyle="bold"
              listening={false}
            />
          </Group>
          <Group
            x={rightMinusX}
            y={controlY}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect();
              onShrinkRight?.();
            }}
          >
            <Rect
              x={0}
              y={0}
              width={12}
              height={12}
              cornerRadius={2}
              fill="#475569"
              stroke="#334155"
              strokeWidth={1}
            />
            <Text
              x={3.6}
              y={0.4}
              text="-"
              fill="#FFFFFF"
              fontSize={10}
              fontStyle="bold"
              listening={false}
            />
          </Group>
        </>
      )}

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

export default BusbarSymbol;
