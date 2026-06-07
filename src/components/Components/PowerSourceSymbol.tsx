import React, { useMemo } from 'react';
import { Group, Circle, Line, Text, Arc } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import { getCanvasInteractionColors } from '../../design/canvasInteractionColors';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const BODY_R = 20;

/** Unit direction from origin toward terminal; stub starts on body circle. */
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
  if (u.includes('N')) return '#2563EB';
  return '#7C3F19';
}

const PowerSourceSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const v = component.properties.voltage || 230;

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
          radius={maxReach}
          stroke={getCanvasInteractionColors().selection}
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle
        x={0}
        y={0}
        radius={BODY_R}
        fill={energized ? '#FEF3C7' : '#F3F4F6'}
        stroke={energized ? '#F59E0B' : '#374151'}
        strokeWidth={2}
        shadowColor={energized ? '#F59E0B' : undefined}
        shadowBlur={energized ? 10 : 0}
      />

      <Arc
        x={-4}
        y={0}
        innerRadius={0}
        outerRadius={8}
        angle={180}
        rotation={-90}
        stroke="#374151"
        strokeWidth={1.5}
        fill="transparent"
      />
      <Arc
        x={4}
        y={0}
        innerRadius={0}
        outerRadius={8}
        angle={180}
        rotation={90}
        stroke="#374151"
        strokeWidth={1.5}
        fill="transparent"
      />

      <Text
        text={`${v}V`}
        x={-22}
        y={-30}
        width={44}
        align="center"
        fontSize={9}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Text
        text="1φ"
        x={-8}
        y={-8}
        fontSize={10}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      {stubs.map(({ cp, x0, y0, x1, y1, stroke }) => (
        <React.Fragment key={cp.id}>
          <Line
            points={[x0, y0, x1, y1]}
            stroke={stroke}
            strokeWidth={2.5}
            lineCap="round"
          />
          <Text
            text={cp.label.toUpperCase().includes('N') ? 'N' : 'L'}
            x={x1 - 5}
            y={y1 - 14}
            width={10}
            align="center"
            fontSize={8}
            fill={stroke}
            fontStyle="bold"
            listening={false}
          />
        </React.Fragment>
      ))}

      <ComponentCanvasLabel
        componentId={component.id}
        label={component.label}
        x={-28}
        y={labelY}
        width={56}
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

export default PowerSourceSymbol;
