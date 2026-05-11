import React, { useEffect, useRef } from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import Konva from 'konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { startKonvaLayerAnimation } from '../../utils/konvaLayerAnimation';
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

const COLOR_HEX: Record<string, { fill: string; glow: string; ring: string }> =
  {
    red: { fill: '#EF4444', glow: '#FCA5A5', ring: '#7F1D1D' },
    green: { fill: '#22C55E', glow: '#86EFAC', ring: '#14532D' },
    amber: { fill: '#F59E0B', glow: '#FCD34D', ring: '#78350F' },
    blue: { fill: '#3B82F6', glow: '#93C5FD', ring: '#1E3A8A' },
    white: { fill: '#F3F4F6', glow: '#FFFFFF', ring: '#9CA3AF' },
  };

/**
 * Panel-front signal lamp. Visual treatment:
 *  - Off: dark coloured ring on grey body.
 *  - On : ring filled with selected colour and a soft pulsing halo so a row
 *    of L1/L2/L3 indicators is unmistakeable on the schematic.
 */
const IndicatorLampSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const colorKey = component.properties.indicatorColor ?? 'red';
  const phaseTag = component.properties.indicatorPhaseTag ?? 'L';
  const palette = COLOR_HEX[colorKey] ?? COLOR_HEX.red;
  const glowRef = useRef<Konva.Circle>(null);

  useEffect(() => {
    if (!energized) return;
    const anim = startKonvaLayerAnimation(glowRef.current, (frame) => {
      if (frame && glowRef.current) {
        const o = 0.25 + 0.12 * Math.sin(frame.time * 0.004);
        glowRef.current.opacity(o);
      }
    });
    if (!anim) return;
    return () => {
      anim.stop();
    };
  }, [energized]);

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
          <Circle
            x={0}
            y={0}
            radius={18}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
          />
        )}

        {energized && (
          <Circle
            ref={glowRef}
            x={0}
            y={0}
            radius={20}
            fill={palette.glow}
            opacity={0.3}
            listening={false}
          />
        )}

        <Circle
          x={0}
          y={0}
          radius={12}
          fill={energized ? palette.fill : '#E5E7EB'}
          stroke={palette.ring}
          strokeWidth={2}
          shadowColor={energized ? palette.fill : undefined}
          shadowBlur={energized ? 10 : 0}
        />

        <Line
          points={[-5, -5, 5, 5]}
          stroke={energized ? palette.ring : '#9CA3AF'}
          strokeWidth={1.2}
        />
        <Line
          points={[5, -5, -5, 5]}
          stroke={energized ? palette.ring : '#9CA3AF'}
          strokeWidth={1.2}
        />

        <Text
          text={phaseTag}
          x={-12}
          y={-6}
          width={24}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill={energized ? '#FFFFFF' : palette.ring}
          listening={false}
        />

        <Line points={[0, -12, 0, -16]} stroke="#374151" strokeWidth={2} />
        <Line points={[0, 12, 0, 16]} stroke="#374151" strokeWidth={2} />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-24}
          y={20}
          width={48}
          fontSize={component.properties.labelFontSize ?? 7}
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

export default IndicatorLampSymbol;
