import React from 'react';
import { Group, Rect, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const DoorInterlockSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const closed = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const caption = component.type === 'mechanical_interlock' ? 'Mech' : 'Door';
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
        onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Rect
            x={-22}
            y={-24}
            width={44}
            height={48}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-16}
          y={-16}
          width={32}
          height={32}
          fillLinearGradientStartPoint={{ x: 0, y: -16 }}
          fillLinearGradientEndPoint={{ x: 0, y: 16 }}
          fillLinearGradientColorStops={
            closed
              ? [0, '#F0FDF4', 1, '#DCFCE7']
              : [0, '#F8FAFC', 1, '#E5E7EB']
          }
          stroke={closed ? '#16A34A' : '#6B7280'}
          strokeWidth={OUTLINE}
          cornerRadius={3}
          shadowColor="#0F172A"
          shadowBlur={3}
          shadowOpacity={0.2}
          shadowOffsetY={1}
        />
        <Rect
          x={-14}
          y={-14}
          width={28}
          height={28}
          fill="#FFFFFF"
          opacity={0.12}
          cornerRadius={2}
          listening={false}
        />
        <Line points={[0, -20, 0, -16]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, 16, 0, 20]} stroke="#374151" strokeWidth={2} />
        {closed ? (
          <Line points={[0, -8, 0, 8]} stroke="#16A34A" strokeWidth={2.3} />
        ) : (
          <Line points={[0, -8, 9, 8]} stroke="#6B7280" strokeWidth={2.3} />
        )}
        <Circle x={-8} y={-8} radius={2.5} fill="#6B7280" />
        <Circle x={8} y={8} radius={1.4} fill="#94A3B8" listening={false} />
        <Text
          text={caption}
          x={-16}
          y={18}
          width={32}
          align="center"
          fontSize={7}
          fill="#6B7280"
          listening={false}
        />
        {energized && <Circle x={10} y={-10} radius={2.5} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-30}
          y={28}
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

export default DoorInterlockSymbol;

