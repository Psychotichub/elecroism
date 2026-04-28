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

const SignalIsolationSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const isOpto = component.type === 'optocoupler_module';
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
            x={-34}
            y={-26}
            width={68}
            height={52}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-30}
          y={-22}
          width={60}
          height={44}
          fill={energized ? '#ECFEFF' : '#F3F4F6'}
          stroke={energized ? '#0891B2' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Text
          text={isOpto ? 'OPTO' : 'ISOLATOR'}
          x={-28}
          y={-14}
          width={56}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#155E75"
          listening={false}
        />
        <Line points={[0, -6, 0, 14]} stroke="#9CA3AF" strokeWidth={1.2} dash={[2, 2]} />
        {isOpto ? (
          <>
            <Line points={[-14, 10, -4, 10]} stroke="#0F766E" strokeWidth={1.5} />
            <Line points={[4, 10, 14, 10]} stroke="#0F766E" strokeWidth={1.5} />
            <Line points={[-2, 6, 2, 10]} stroke="#0F766E" strokeWidth={1.2} />
            <Line points={[-2, 12, 2, 16]} stroke="#0F766E" strokeWidth={1.2} />
          </>
        ) : (
          <Text
            text="4-20mA / 0-10V"
            x={-28}
            y={6}
            width={56}
            align="center"
            fontSize={6}
            fill="#475569"
            listening={false}
          />
        )}
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-34} y={28} width={68}           fontSize={component.properties.labelFontSize ?? 8}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {component.connectionPoints.map((cp, idx) => {
          const body = { left: -30, right: 30, top: -22, bottom: 22 };
          const pinLen = 10;
          const dL = Math.abs(cp.x - body.left);
          const dR = Math.abs(cp.x - body.right);
          const dT = Math.abs(cp.y - body.top);
          const dB = Math.abs(cp.y - body.bottom);
          const m = Math.min(dL, dR, dT, dB);
          const pin =
            m === dL
              ? { sx: body.left, sy: cp.y, ex: body.left - pinLen, ey: cp.y, side: 'left' as const }
              : m === dR
                ? { sx: body.right, sy: cp.y, ex: body.right + pinLen, ey: cp.y, side: 'right' as const }
                : m === dT
                  ? { sx: cp.x, sy: body.top, ex: cp.x, ey: body.top - pinLen, side: 'top' as const }
                  : { sx: cp.x, sy: body.bottom, ex: cp.x, ey: body.bottom + pinLen, side: 'bottom' as const };
          const c = '#0F766E';
          const nx = pin.side === 'left' ? pin.sx + 2 : pin.side === 'right' ? pin.sx - 8 : pin.sx - 2;
          const ny = pin.side === 'top' ? pin.sy + 2 : pin.side === 'bottom' ? pin.sy - 6 : pin.sy - 2;
          return (
            <React.Fragment key={`${cp.id}-stub`}>
              <Line
                points={[pin.sx, pin.sy, pin.ex, pin.ey]}
                stroke={c}
                strokeWidth={1.2}
                lineCap="round"
                listening={false}
              />
              <Text
                text={`${idx + 1}`}
                x={nx}
                y={ny}
                width={8}
                align="center"
                fontSize={3.5}
                fill={c}
                listening={false}
              />
            </React.Fragment>
          );
        })}
        {showConnectionPoints &&
          component.connectionPoints.map((cp) => (
            <Circle
              key={cp.id}
              x={cp.x}
              y={cp.y}
              radius={2.8}
              fill="#3B82F6"
              opacity={0.68}
              stroke="#2563EB"
              strokeWidth={1}
            />
          ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default SignalIsolationSymbol;

