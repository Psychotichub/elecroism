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

const ModbusTcpGatewaySymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const ip = component.properties.gatewayIp ?? '192.168.1.100';
  const port = component.properties.gatewayPort ?? 502;
  const terminalLabelColor = (label: string): string => {
    const u = label.toUpperCase();
    if (u.startsWith('PWR_')) return '#7C3F19';
    if (u.startsWith('RS485_')) return '#7C2D12';
    if (u.includes('SHIELD') || u.includes('FG')) return '#0F766E';
    if (u.includes('ETH')) return '#1D4ED8';
    return '#334155';
  };
  const body = { left: -30, right: 30, top: -22, bottom: 22 };
  const pinLen = 10;
  const pinFromTerminal = (cp: { x: number; y: number }) => {
    const dL = Math.abs(cp.x - body.left);
    const dR = Math.abs(cp.x - body.right);
    const dT = Math.abs(cp.y - body.top);
    const dB = Math.abs(cp.y - body.bottom);
    const m = Math.min(dL, dR, dT, dB);
    if (m === dL) return { sx: body.left, sy: cp.y, ex: body.left - pinLen, ey: cp.y, side: 'left' as const };
    if (m === dR) return { sx: body.right, sy: cp.y, ex: body.right + pinLen, ey: cp.y, side: 'right' as const };
    if (m === dT) return { sx: cp.x, sy: body.top, ex: cp.x, ey: body.top - pinLen, side: 'top' as const };
    return { sx: cp.x, sy: body.bottom, ex: cp.x, ey: body.bottom + pinLen, side: 'bottom' as const };
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
          fillLinearGradientStartPoint={{ x: 0, y: -22 }}
          fillLinearGradientEndPoint={{ x: 0, y: 22 }}
          fillLinearGradientColorStops={
            energized
              ? [0, '#F8FAFC', 0.55, '#E0F2FE', 1, '#BFDBFE']
              : [0, '#F8FAFC', 1, '#E5E7EB']
          }
          stroke={energized ? '#0369A1' : '#6B7280'}
          strokeWidth={1.6}
          cornerRadius={4}
          shadowColor="#0F172A"
          shadowBlur={4}
          shadowOpacity={0.2}
          shadowOffsetY={1}
        />
        <Text text="MODBUS TCP" x={-28} y={-15} width={56} align="center" fontSize={9} fill="#0C4A6E" fontStyle="bold" listening={false} />
        <Text text="RTU GATEWAY" x={-28} y={-4} width={56} align="center" fontSize={7} fill="#475569" listening={false} />
        <Text text={ip} x={-28} y={5} width={56} align="center" fontSize={7} fill="#374151" listening={false} />
        <Text text={`:${port}`} x={-28} y={14} width={56} align="center" fontSize={7} fill="#6B7280" listening={false} />
        <Line points={[-10, 9, 10, 9]} stroke="#6B7280" strokeWidth={1.2} listening={false} />
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id} label={component.label} x={-34} y={28} width={68}           fontSize={component.properties.labelFontSize ?? 7}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        {component.connectionPoints.map((cp, idx) => {
          const pin = pinFromTerminal(cp);
          const c = terminalLabelColor(cp.label);
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

export default ModbusTcpGatewaySymbol;

