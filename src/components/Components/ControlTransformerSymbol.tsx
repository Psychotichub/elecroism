import React from 'react';
import { Group, Rect, Line, Text, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ControlTransformerSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const v = component.properties.voltage ?? 24;
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
            x={-30}
            y={-26}
            width={60}
            height={52}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-26}
          y={-22}
          width={52}
          height={44}
          fill={energized ? '#E0E7FF' : '#F3F4F6'}
          stroke={energized ? '#4338CA' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Line points={[-18, -4, -18, 4]} stroke="#374151" strokeWidth={2} />
        <Line points={[-12, -4, -12, 4]} stroke="#374151" strokeWidth={2} />
        <Line points={[12, -4, 12, 4]} stroke="#374151" strokeWidth={2} />
        <Line points={[18, -4, 18, 4]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, -10, 0, 10]} stroke="#9CA3AF" strokeWidth={1.2} />
        <Text
          text={`XFMR ${v}V`}
          x={-24}
          y={8}
          width={48}
          align="center"
          fontSize={8}
          fill="#374151"
          fontStyle="bold"
          listening={false}
        />
        <Line points={[-18, -22, -18, -26]} stroke="#374151" strokeWidth={2} />
        <Line points={[18, -22, 18, -26]} stroke="#374151" strokeWidth={2} />
        <Line points={[-18, 22, -18, 26]} stroke="#374151" strokeWidth={2} />
        <Line points={[18, 22, 18, 26]} stroke="#374151" strokeWidth={2} />
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-32} y={28} width={64}           fontSize={component.properties.labelFontSize ?? 7}
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

export default ControlTransformerSymbol;

