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

const HrcFuseSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isClosed = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const rating = component.properties.ratingAmps ?? 32;
  const title = component.type === 'control_circuit_fuse' ? 'CTRL' : 'HRC';

  useEffect(() => {
    if (!isTripped) return;
    const interval = setInterval(() => setFlashVisible((v) => !v), 450);
    return () => clearInterval(interval);
  }, [isTripped]);

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
            x={-24}
            y={-34}
            width={48}
            height={68}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        <Line points={[0, -30, 0, -18]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, 18, 0, 30]} stroke="#374151" strokeWidth={2} />

        <Rect
          x={-12}
          y={-18}
          width={24}
          height={36}
          fill={energized ? '#FFF7ED' : '#F3F4F6'}
          stroke="#374151"
          strokeWidth={OUTLINE}
          cornerRadius={3}
          shadowColor="#111827"
          shadowBlur={3}
          shadowOpacity={0.2}
          shadowOffsetY={1}
        />
        <Rect
          x={-10}
          y={-16}
          width={20}
          height={32}
          fill="#FFFFFF"
          opacity={0.14}
          cornerRadius={2}
          listening={false}
        />

        <Rect
          x={-9}
          y={-12}
          width={18}
          height={24}
          fill={isTripped ? '#FCA5A5' : '#FFFFFF'}
          stroke="#6B7280"
          strokeWidth={0.9}
          cornerRadius={2}
        />
        <Circle x={0} y={-9} radius={1.2} fill="#6B7280" listening={false} />
        <Circle x={0} y={9} radius={1.2} fill="#6B7280" listening={false} />

        {isClosed ? (
          <Line
            points={[-5, 10, 0, 4, 5, -2]}
            stroke="#16A34A"
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
        ) : (
          <Line
            points={[-5, 10, 0, 2, 5, -10]}
            stroke="#EF4444"
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
        )}

        <Text
          text={title}
          x={-10}
          y={-28}
          width={20}
          align="center"
          fontSize={7}
          fill="#374151"
          fontStyle="bold"
          listening={false}
        />
        <Text
          text={`${rating}A`}
          x={-12}
          y={20}
          width={24}
          align="center"
          fontSize={7}
          fill="#6B7280"
          listening={false}
        />

        {isTripped && (
          <Circle
            x={8}
            y={-12}
            radius={3}
            fill="#EF4444"
            opacity={flashVisible ? 1 : 0.35}
          />
        )}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-32}
          y={34}
          width={64}
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

export default HrcFuseSymbol;
