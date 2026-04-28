import React from 'react';
import { Group, Rect, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult, WireColor } from '../../types';
import { getWireColor } from '../../utils/geometry';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
  effectiveWireColor?: WireColor;
}

const BusbarSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
  effectiveWireColor,
}) => {
  const OUTLINE = 1.6;
  const energized = nodeResult?.energized || false;
  const configuredColor = getWireColor(
    effectiveWireColor || component.properties.wireColor || 'brown'
  );
  const barColor = energized ? configuredColor : '#9CA3AF';
  const barStroke = energized ? '#374151' : '#6B7280';

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
          x={-64}
          y={-8}
          width={128}
          height={16}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={2}
        />
      )}

      <Rect
        x={-60}
        y={-4}
        width={120}
        height={8}
        fillLinearGradientStartPoint={{ x: -60, y: 0 }}
        fillLinearGradientEndPoint={{ x: 60, y: 0 }}
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
      {[-46, -22, 2, 26, 50].map((sx) => (
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
        x={-60}
        y={-16}
        width={120}
        fontSize={component.properties.labelFontSize ?? 9}
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

export default BusbarSymbol;
