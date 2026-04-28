import React from 'react';
import { Group, Rect, Circle, Text, Line } from 'react-konva';
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

const EarthLeakageRelayCbctSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const on = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const ma = component.properties.earthLeakageTripMa ?? 30;
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
          fill={on ? '#ECFDF5' : '#F3F4F6'}
          stroke={on ? '#16A34A' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Circle x={0} y={0} radius={9} stroke="#374151" strokeWidth={1.5} fill="#F9FAFB" />
        <Text text="CBCT" x={-14} y={10} width={28} align="center" fontSize={7} fill="#6B7280" listening={false} />
        <Text
          text={`ELR ${ma}mA`}
          x={-22}
          y={-16}
          width={44}
          align="center"
          fontSize={8}
          fill="#374151"
          fontStyle="bold"
          listening={false}
        />
        <Line points={[0, -22, 0, -26]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, 22, 0, 26]} stroke="#374151" strokeWidth={2} />
        {energized && <Circle x={18} y={-12} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-30} y={28} width={60}           fontSize={component.properties.labelFontSize ?? 8}
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

export default EarthLeakageRelayCbctSymbol;

