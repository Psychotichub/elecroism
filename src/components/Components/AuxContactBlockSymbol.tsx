import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
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

const AuxContactBlockSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const picked = component.state === 'on';

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
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Rect
            x={-26}
            y={-28}
            width={52}
            height={56}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={6}
          />
        )}

        <Rect
          x={-22}
          y={-24}
          width={44}
          height={48}
          fill={energized ? '#ECFDF5' : '#F9FAFB'}
          stroke="#374151"
          strokeWidth={1.5}
          cornerRadius={4}
        />

        <Text
          text="AUX"
          x={-20}
          y={-20}
          width={40}
          align="center"
          fontSize={8}
          fontStyle="bold"
          fill="#111827"
          listening={false}
        />

        <Line points={[-16, -20, -4, -20]} stroke="#374151" strokeWidth={1.4} />
        <Line points={[4, -20, 16, -20]} stroke="#374151" strokeWidth={1.4} />
        {picked && <Line points={[-2, -23, 2, -20]} stroke="#16A34A" strokeWidth={1.6} />}
        {!picked && <Line points={[-2, -24, 2, -20]} stroke="#374151" strokeWidth={1.3} />}

        <Line points={[-16, 20, -4, 20]} stroke="#374151" strokeWidth={1.4} />
        <Line points={[4, 20, 16, 20]} stroke="#374151" strokeWidth={1.4} />
        {!picked && <Line points={[-2, 17, 2, 20]} stroke="#16A34A" strokeWidth={1.6} />}
        {picked && <Line points={[-2, 16, 2, 20]} stroke="#374151" strokeWidth={1.3} />}

        <Text text="NO" x={-2} y={-30} width={24} fontSize={6} fill="#6B7280" listening={false} />
        <Text text="NC" x={-2} y={10} width={24} fontSize={6} fill="#6B7280" listening={false} />

        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-30} y={30} width={60} fontSize={component.properties.labelFontSize ?? 8}           offsetX={component.properties.labelOffsetX ?? 0}
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
        {component.connectionPoints.map((cp) => (
          <Text
            key={`${cp.id}-term-label`}
            text={cp.label}
            x={cp.x - 14}
            y={cp.y + 7}
            width={28}
            fontSize={6}
            fill="#374151"
            align="center"
            listening={false}
          />
        ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default AuxContactBlockSymbol;
