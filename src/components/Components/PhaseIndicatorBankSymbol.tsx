import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
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

const PhaseIndicatorBankSymbol: React.FC<Props> = ({
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
            x={-40}
            y={-28}
            width={80}
            height={56}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-36}
          y={-24}
          width={72}
          height={48}
          fill={energized ? '#ECFEFF' : '#F3F4F6'}
          stroke="#475569"
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Circle x={-18} y={0} radius={8} fill={energized ? '#EF4444' : '#D1D5DB'} stroke="#7F1D1D" strokeWidth={1.2} />
        <Circle x={0} y={0} radius={8} fill={energized ? '#F59E0B' : '#D1D5DB'} stroke="#78350F" strokeWidth={1.2} />
        <Circle x={18} y={0} radius={8} fill={energized ? '#22C55E' : '#D1D5DB'} stroke="#14532D" strokeWidth={1.2} />
        <Text text="L1" x={-24} y={-3} width={12} fontSize={7} align="center" fill="#111827" listening={false} />
        <Text text="L2" x={-6} y={-3} width={12} fontSize={7} align="center" fill="#111827" listening={false} />
        <Text text="L3" x={12} y={-3} width={12} fontSize={7} align="center" fill="#111827" listening={false} />

        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-40} y={30} width={80}           fontSize={component.properties.labelFontSize ?? 7}
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

export default PhaseIndicatorBankSymbol;
