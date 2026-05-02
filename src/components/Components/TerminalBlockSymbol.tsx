import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
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

const TerminalBlockSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;

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
            x={-24}
            y={-24}
            width={48}
            height={54}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-18}
          y={-18}
          width={36}
          height={36}
          fill={energized ? '#E0F2FE' : '#F3F4F6'}
          stroke={energized ? '#0284C7' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={3}
        />
        <Line points={[0, -18, 0, 18]} stroke="#6B7280" strokeWidth={1.2} dash={[2, 2]} />
        <Text
          text="TB"
          x={-12}
          y={-5}
          width={24}
          align="center"
          fontSize={9}
          fill="#0F172A"
          fontStyle="bold"
          listening={false}
        />
        <Line points={[0, -18, 0, -22]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, 18, 0, 22]} stroke="#374151" strokeWidth={2} />
        {energized && <Circle x={12} y={-10} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-30} y={24} width={60}           fontSize={component.properties.labelFontSize ?? 7}
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

export default TerminalBlockSymbol;
