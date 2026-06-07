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

const CommInfraSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const energized = nodeResult?.energized || false;
  const moduleType =
    component.type === 'relay_interface_card'
      ? 'relay'
      : component.type === 'modbus_rtu_module'
        ? 'rtu'
      : component.type === 'communication_converter'
        ? 'converter'
      : component.type === 'iot_gateway'
        ? 'iot'
      : component.type === 'cloud_monitoring_module'
        ? 'cloud'
      : component.type === 'energy_management_controller'
        ? 'emc'
      : 'switch';
  const title =
    component.type === 'relay_interface_card'
      ? 'RELAY IF'
      : component.type === 'modbus_rtu_module'
        ? 'MB RTU'
      : component.type === 'iot_gateway'
        ? 'IOT GW'
      : component.type === 'cloud_monitoring_module'
        ? 'CLOUD MON'
      : component.type === 'energy_management_controller'
        ? 'EMC'
      : component.type === 'communication_converter'
        ? 'COMM CVT'
        : 'ETH SW';
  const subtitle =
    component.type === 'relay_interface_card'
      ? `${component.properties.ioChannels ?? 8} ch`
      : component.type === 'modbus_rtu_module'
        ? 'RS485 A/B/GND + FG'
      : component.type === 'iot_gateway'
        ? `${component.properties.gatewayIp ?? '10.10.10.10'}:${component.properties.gatewayPort ?? 8883}`
      : component.type === 'cloud_monitoring_module'
        ? `${component.properties.gatewayIp ?? 'cloud.bms.local'}:${component.properties.gatewayPort ?? 443}`
      : component.type === 'energy_management_controller'
        ? `${component.properties.ioChannels ?? 16} pts`
      : component.type === 'communication_converter'
        ? `${component.properties.gatewayIp ?? '192.168.1.120'}:${component.properties.gatewayPort ?? 502}`
        : `${component.properties.ioChannels ?? 5} ports`;

  const terminalLabelColor = (label: string): string => {
    const u = label.toUpperCase();
    if (u.startsWith('PWR_')) return '#7C3F19'; // power feed
    if (u.includes('ETH')) return '#1D4ED8'; // ethernet
    if (u.startsWith('RS485_')) return '#7C2D12'; // serial comm pair/reference
    if (u.startsWith('RS232_')) return '#7C2D12'; // serial tx/rx/gnd
    if (u.includes('SHIELD') || u.includes('FG')) return '#0F766E'; // shield/frame
    if (u.startsWith('DI')) return '#1D4ED8'; // digital input
    if (u.startsWith('DO_')) return '#B91C1C'; // digital output/relay
    if (u.startsWith('AI')) return '#7E22CE'; // analog input
    if (u.startsWith('AO')) return '#BE185D'; // analog output
    return '#334155';
  };

  const body = { left: -30, right: 30, top: -22, bottom: 22 };
  const pinLen = 10;
  const pinFromTerminal = (cp: ConnectionPoint) => {
    if (component.type === 'modbus_rtu_module' && cp.label === 'DO_NC') {
      const y = Math.max(body.top + 2, Math.min(body.bottom - 2, cp.y));
      return { sx: body.right, sy: y, ex: body.right + pinLen, ey: y, side: 'right' as const };
    }
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

  const renderFrontDetails = () => {
    if (moduleType === 'switch') {
      return (
        <>
          {[-18, -9, 0, 9, 18].map((x, i) => (
            <Rect
              key={`sw-port-${i}`}
              x={x - 3.2}
              y={8}
              width={6.4}
              height={5}
              fill="#0F172A"
              stroke="#22D3EE"
              strokeWidth={0.6}
              listening={false}
            />
          ))}
        </>
      );
    }
    if (moduleType === 'relay') {
      return (
        <>
          {[-16, -8, 0, 8, 16].map((x, i) => (
            <Rect
              key={`relay-ch-${i}`}
              x={x - 3}
              y={8}
              width={6}
              height={5}
              fill="#111827"
              stroke="#F59E0B"
              strokeWidth={0.6}
              listening={false}
            />
          ))}
        </>
      );
    }
    if (moduleType === 'rtu' || moduleType === 'converter') {
      return (
        <>
          <Line points={[-18, 10, -2, 10]} stroke="#7C2D12" strokeWidth={1.1} listening={false} />
          <Line points={[2, 10, 18, 10]} stroke="#1D4ED8" strokeWidth={1.1} listening={false} />
          <Circle x={-20} y={10} radius={1.5} fill="#7C2D12" listening={false} />
          <Circle x={20} y={10} radius={1.5} fill="#1D4ED8" listening={false} />
        </>
      );
    }
    if (moduleType === 'iot' || moduleType === 'cloud' || moduleType === 'emc') {
      return (
        <>
          <Line points={[-10, 9, 0, 5, 10, 9]} stroke="#0EA5E9" strokeWidth={0.9} listening={false} />
          <Line points={[-10, 12, 0, 8, 10, 12]} stroke="#0284C7" strokeWidth={0.9} listening={false} />
          <Circle x={0} y={13.5} radius={1.6} fill="#22C55E" listening={false} />
        </>
      );
    }
    return null;
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
          fillLinearGradientStartPoint={{ x: 0, y: -22 }}
          fillLinearGradientEndPoint={{ x: 0, y: 22 }}
          fillLinearGradientColorStops={
            energized
              ? [0, '#F8FAFC', 0.55, '#E0F2FE', 1, '#BFDBFE']
              : [0, '#F8FAFC', 1, '#E5E7EB']
          }
          stroke={energized ? '#0369A1' : '#6B7280'}
          strokeWidth={OUTLINE}
          cornerRadius={4}
          shadowColor="#0F172A"
          shadowBlur={4}
          shadowOpacity={0.2}
          shadowOffsetY={1}
        />
        <Rect
          x={-30}
          y={-22}
          width={60}
          height={5}
          fill={
            moduleType === 'switch'
              ? '#0F766E'
              : moduleType === 'relay'
                ? '#92400E'
                : moduleType === 'rtu' || moduleType === 'converter'
                  ? '#7C2D12'
                  : '#0C4A6E'
          }
          opacity={0.9}
          cornerRadius={[4, 4, 0, 0]}
          listening={false}
        />
        <Text
          text={title}
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
          text={subtitle}
          x={-28}
          y={-2}
          width={56}
          align="center"
          fontSize={7}
          fill="#475569"
          listening={false}
        />
        {renderFrontDetails()}
        {energized && <Circle x={22} y={-14} radius={2.8} fill="#22C55E" />}
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
          const c = terminalLabelColor(cp.label);
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

export default CommInfraSymbol;

