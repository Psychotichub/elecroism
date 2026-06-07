import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
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

function signalIsolationTerminalTag(raw: string): string {
  let s = raw.trim();
  if (!s) return '';
  s = s.replace(/_(SIG|CH)\b/gi, '').replace(/_/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s
    .replace(/\bANALOG\b/gi, 'AI')
    .replace(/\bFIELD\b/gi, 'FO')
    .replace(/\bDRY\b/gi, 'DO')
    .replace(/\bRETURN\b/gi, 'RTN')
    .replace(/\bNEG\b/gi, '-')
    .replace(/\bPOS\b/gi, '+');
  s = s.replace(/\s+/g, ' ').trim();
  return s.slice(0, 8);
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
          <Rect
            x={-34}
            y={-26}
            width={68}
            height={52}
            stroke={getCanvasInteractionColors().selection}
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
          fill={isOpto ? (energized ? '#ECFDF5' : '#F3F4F6') : energized ? '#ECFEFF' : '#F3F4F6'}
          stroke={isOpto ? (energized ? '#059669' : '#6B7280') : energized ? '#0891B2' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Rect
          x={-30}
          y={-22}
          width={60}
          height={5}
          fill={isOpto ? '#16A34A' : '#0EA5E9'}
          cornerRadius={4}
        />
        <Text
          text={isOpto ? 'OPTOCOUPLER' : 'SIGNAL ISOLATOR'}
          x={-28}
          y={-14.5}
          width={56}
          align="center"
          fontSize={7}
          fontStyle="bold"
          fill={isOpto ? '#14532D' : '#155E75'}
          listening={false}
        />
        <Line points={[0, -16, 0, 18]} stroke="#9CA3AF" strokeWidth={1.2} dash={[2, 2]} />
        {isOpto ? (
          <>
            <Text
              text="DI -> DRY OUT"
              x={-26}
              y={-3}
              width={52}
              align="center"
              fontSize={5.5}
              fill="#166534"
              listening={false}
            />
            <Line points={[-15, 8, -6, 8]} stroke="#15803D" strokeWidth={1.4} />
            <Line points={[6, 8, 15, 8]} stroke="#15803D" strokeWidth={1.4} />
            <Line points={[-7, 4, -3, 8]} stroke="#15803D" strokeWidth={1.1} />
            <Line points={[-7, 12, -3, 8]} stroke="#15803D" strokeWidth={1.1} />
            <Line points={[3, 5, 7, 8]} stroke="#15803D" strokeWidth={1.1} />
            <Line points={[3, 11, 7, 8]} stroke="#15803D" strokeWidth={1.1} />
          </>
        ) : (
          <>
            <Text
              text="AI -> AO"
              x={-26}
              y={-3}
              width={52}
              align="center"
              fontSize={6}
              fill="#0C4A6E"
              listening={false}
            />
            <Text
              text="4-20mA / 0-10V"
              x={-28}
              y={5}
              width={56}
              align="center"
              fontSize={5.5}
              fill="#475569"
              listening={false}
            />
          </>
        )}
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-34} y={28} width={68}           fontSize={component.properties.labelFontSize ?? 7}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {component.connectionPoints.map((cp) => {
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
                text={signalIsolationTerminalTag(cp.label)}
                x={nx}
                y={ny}
                width={16}
                align="center"
                fontSize={3.2}
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

