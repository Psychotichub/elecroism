import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import type { CircuitComponent, ConnectionPoint, NodeResult } from '../../types';
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

const BmsIOModuleSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const kind: 'DI' | 'DO' | 'AI' | 'AO' =
    component.type === 'di_module'
      ? 'DI'
      : component.type === 'do_module'
        ? 'DO'
        : component.type === 'ao_module'
          ? 'AO'
          : 'AI';
  const typeAccent =
    kind === 'DI'
      ? '#1D4ED8'
      : kind === 'DO'
        ? '#B91C1C'
        : kind === 'AI'
          ? '#7E22CE'
          : '#BE185D';
  const ioText =
    kind === 'AI'
      ? `${component.properties.ioChannels ?? 4}ch ${component.properties.aiSignalType === '0_10v' ? '0-10V' : '4-20mA'}`
      : kind === 'AO'
        ? `${component.properties.ioChannels ?? 4}ch ${component.properties.aoSignalType === '0_10v' ? '0-10V' : '4-20mA'}`
      : `${component.properties.ioChannels ?? 8}ch`;

  const terminalLineColor = (cp: ConnectionPoint): string => {
    const u = cp.label.toUpperCase();
    if (u.startsWith('PWR_')) return '#7C3F19';
    if (u.includes('SHIELD') || u.includes('FG')) return '#0F766E';
    if (u.includes('_COM')) return '#0F172A';
    if (u.startsWith('DI_')) return '#1D4ED8';
    if (u.startsWith('DO_')) return '#B91C1C';
    if (u.startsWith('AI_')) return '#7E22CE';
    if (u.startsWith('AO_')) return '#BE185D';
    return '#334155';
  };
  const body = { left: -30, right: 30, top: -22, bottom: 22 };
  const pinLen = 10;
  const pinFromTerminal = (cp: ConnectionPoint) => {
    const dL = Math.abs(cp.x - body.left);
    const dR = Math.abs(cp.x - body.right);
    const dT = Math.abs(cp.y - body.top);
    const dB = Math.abs(cp.y - body.bottom);
    const m = Math.min(dL, dR, dT, dB);
    if (m === dL) {
      const y = Math.max(body.top + 2, Math.min(body.bottom - 2, cp.y));
      return { sx: body.left, sy: y, ex: body.left - pinLen, ey: y, side: 'left' as const };
    }
    if (m === dR) {
      const y = Math.max(body.top + 2, Math.min(body.bottom - 2, cp.y));
      return { sx: body.right, sy: y, ex: body.right + pinLen, ey: y, side: 'right' as const };
    }
    if (m === dT) {
      const x = Math.max(body.left + 2, Math.min(body.right - 2, cp.x));
      return { sx: x, sy: body.top, ex: x, ey: body.top - pinLen, side: 'top' as const };
    }
    const x = Math.max(body.left + 2, Math.min(body.right - 2, cp.x));
    return { sx: x, sy: body.bottom, ex: x, ey: body.bottom + pinLen, side: 'bottom' as const };
  };

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
          fill={energized ? '#E0F2FE' : '#F3F4F6'}
          stroke={energized ? '#0284C7' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Rect
          x={-30}
          y={-22}
          width={60}
          height={6}
          fill={typeAccent}
          opacity={0.9}
          cornerRadius={[4, 4, 0, 0]}
          listening={false}
        />
        <Text
          text={`BMS ${kind}`}
          x={-28}
          y={-13}
          width={56}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#FFFFFF"
          listening={false}
        />
        <Text
          text={ioText}
          x={-28}
          y={-1}
          width={56}
          align="center"
          fontSize={7}
          fill="#475569"
          listening={false}
        />
        {energized && <Circle x={24} y={-19} radius={2.4} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-34}
          y={28}
          width={68}
          fontSize={component.properties.labelFontSize ?? 7}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {component.connectionPoints.map((cp, idx) => {
          const pin = pinFromTerminal(cp);
          const c = terminalLineColor(cp);
          const nx =
            pin.side === 'left'
              ? pin.sx + 2
              : pin.side === 'right'
                ? pin.sx - 8
                : pin.sx - 2;
          const ny =
            pin.side === 'top'
              ? pin.sy + 2
              : pin.side === 'bottom'
                ? pin.sy - 6
                : pin.sy - 2;
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
              <Text
                text={cp.label}
                x={pin.side === 'left' ? pin.ex - 24 : pin.side === 'right' ? pin.ex + 2 : pin.ex + 2}
                y={pin.side === 'top' ? pin.ey - 9 : pin.side === 'bottom' ? pin.ey + 2 : pin.ey - 4}
                width={pin.side === 'left' ? 22 : 24}
                align={pin.side === 'left' ? 'right' : 'left'}
                fontSize={3.8}
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

export default BmsIOModuleSymbol;

