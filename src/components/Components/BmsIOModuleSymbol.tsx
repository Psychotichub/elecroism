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

const BmsIOModuleSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const kind =
    component.type === 'di_module'
      ? 'DI'
      : component.type === 'do_module'
        ? 'DO'
        : component.type === 'ao_module'
          ? 'AO'
          : 'AI';
  const ioText =
    kind === 'AI'
      ? `${component.properties.ioChannels ?? 4}ch ${component.properties.aiSignalType === '0_10v' ? '0-10V' : '4-20mA'}`
      : kind === 'AO'
        ? `${component.properties.ioChannels ?? 4}ch ${component.properties.aoSignalType === '0_10v' ? '0-10V' : '4-20mA'}`
      : `${component.properties.ioChannels ?? 4}ch`;

  const terminalLineColor = (idx: number): string => {
    const palette = ['#1D4ED8', '#B91C1C', '#7E22CE', '#0F766E', '#7C3F19', '#BE185D'];
    return palette[idx % palette.length];
  };
  const body = { left: -30, right: 30, top: -22, bottom: 22 };
  const pinLen = 10;
  const pinFromTerminal = (cp: { x: number; y: number }) => {
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
          fill={energized ? '#E0F2FE' : '#F3F4F6'}
          stroke={energized ? '#0284C7' : '#6B7280'}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Text
          text={`BMS ${kind}`}
          x={-28}
          y={-14}
          width={56}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#0C4A6E"
          listening={false}
        />
        <Text
          text={ioText}
          x={-28}
          y={-2}
          width={56}
          align="center"
          fontSize={7}
          fill="#475569"
          listening={false}
        />
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-34} y={28} width={68}           fontSize={component.properties.labelFontSize ?? 8}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {component.connectionPoints.map((cp, idx) => {
          const pin = pinFromTerminal(cp);
          const c = terminalLineColor(idx);
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

