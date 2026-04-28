import React, { useMemo } from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
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

const BODY_R = 20;

function stubFromCenter(cp: { x: number; y: number }): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} {
  const len = Math.hypot(cp.x, cp.y);
  if (len < 1e-6) {
    return { x0: 0, y0: BODY_R, x1: cp.x, y1: cp.y };
  }
  const ux = cp.x / len;
  const uy = cp.y / len;
  return {
    x0: ux * BODY_R,
    y0: uy * BODY_R,
    x1: cp.x,
    y1: cp.y,
  };
}

function stubStroke(label: string): string {
  const u = label.toUpperCase();
  if (u.includes('MINUS')) return '#1F2937';
  return '#DC2626';
}

const DCPowerSourceSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const v = component.properties.voltage ?? 24;

  const stubs = useMemo(
    () =>
      component.connectionPoints.map((cp) => ({
        cp,
        ...stubFromCenter(cp),
        stroke: stubStroke(cp.label),
      })),
    [component.connectionPoints]
  );

  const maxReach = useMemo(() => {
    let m = BODY_R + 4;
    for (const cp of component.connectionPoints) {
      m = Math.max(m, Math.hypot(cp.x, cp.y) + 6);
    }
    return m;
  }, [component.connectionPoints]);

  const labelY = useMemo(() => {
    let y = 22;
    for (const cp of component.connectionPoints) {
      y = Math.max(y, cp.y + 8);
    }
    return y;
  }, [component.connectionPoints]);

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
            radius={maxReach}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
          />
        )}

        <Circle
          x={0}
          y={0}
          radius={BODY_R}
          fill={energized ? '#DBEAFE' : '#F3F4F6'}
          stroke={energized ? '#2563EB' : '#374151'}
          strokeWidth={2}
          shadowColor={energized ? '#3B82F6' : undefined}
          shadowBlur={energized ? 8 : 0}
        />

        <Text
          text="DC"
          x={-14}
          y={-10}
          width={28}
          fontSize={12}
          fill="#1E40AF"
          fontStyle="bold"
          align="center"
          listening={false}
        />

        <Text
          text={`${v} V`}
          x={-22}
          y={-30}
          width={44}
          align="center"
          fontSize={9}
          fill="#1E3A8A"
          fontStyle="bold"
          listening={false}
        />

        {stubs.map(({ cp, x0, y0, x1, y1, stroke }) => {
          const isMinus = cp.label.toUpperCase().includes('MINUS');
          return (
            <React.Fragment key={cp.id}>
              <Line
                points={[x0, y0, x1, y1]}
                stroke={stroke}
                strokeWidth={2.5}
                lineCap="round"
              />
              <Text
                text={isMinus ? '−' : '+'}
                x={x1 - 5}
                y={y1 - 14}
                width={10}
                align="center"
                fontSize={10}
                fill={stroke}
                fontStyle="bold"
                listening={false}
              />
            </React.Fragment>
          );
        })}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-28}
          y={labelY}
          width={56}
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

export default DCPowerSourceSymbol;
