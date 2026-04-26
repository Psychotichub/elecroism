import React, { useEffect, useRef } from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import Konva from 'konva';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ThreePhaseMotorSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const isFault = component.state === 'fault';
  const rotorRef = useRef<Konva.Group>(null);

  useEffect(() => {
    if (!energized || isFault || !rotorRef.current) return;
    const anim = new Konva.Animation((frame) => {
      if (frame && rotorRef.current) {
        rotorRef.current.rotation(frame.time * 0.08);
      }
    }, rotorRef.current.getLayer());
    anim.start();
    return () => {
      anim.stop();
    };
  }, [energized, isFault]);

  const fill = isFault ? '#FECACA' : energized ? '#4ADE80' : '#E5E7EB';
  const stroke = isFault ? '#DC2626' : '#374151';

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
        <Circle
          x={0}
          y={0}
          radius={26}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle
        x={0}
        y={0}
        radius={18}
        fill={fill}
        stroke={stroke}
        strokeWidth={isFault ? 2 : 1.5}
        shadowColor={energized && !isFault ? '#22C55E' : undefined}
        shadowBlur={energized && !isFault ? 8 : 0}
      />

      <Group ref={rotorRef}>
        <Text
          text="M3"
          x={-10}
          y={-7}
          fontSize={12}
          fill="#374151"
          fontStyle="bold"
          listening={false}
        />
      </Group>

      <Line points={[-20, -12, -20, -22]} stroke="#7C3F19" strokeWidth={1.5} />
      <Line points={[0, -18, 0, -22]} stroke="#111827" strokeWidth={1.5} />
      <Line points={[20, -12, 20, -22]} stroke="#4B5563" strokeWidth={1.5} />
      <Line points={[0, 18, 0, 22]} stroke="#2563EB" strokeWidth={1.5} />

      <Text
        text={component.label}
        x={22}
        y={-8}
        fontSize={9}
        fill="#6B7280"
        listening={false}
      />
      <Text
        text={`${component.properties.powerWatts || 0}W`}
        x={22}
        y={4}
        fontSize={8}
        fill="#9CA3AF"
        listening={false}
      />

      {isFault && (
        <Text
          text="OL"
          x={-8}
          y={8}
          fontSize={8}
          fill="#B91C1C"
          fontStyle="bold"
          listening={false}
        />
      )}

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

export default ThreePhaseMotorSymbol;
