import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
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

const minX = -38;
const maxX = 38;
const minY = -28;
const maxY = 28;
const bodyW = maxX - minX;
const bodyH = maxY - minY;

function fmtKw(w: number): string {
  if (!isFinite(w)) return '0.00';
  if (Math.abs(w) >= 1000) return (w / 1000).toFixed(2);
  return w.toFixed(0);
}

/**
 * Three-phase + N multifunction energy meter (digital display style).
 *
 * The meter is a passthrough device: IN_Lx and OUT_Lx (plus IN_N / OUT_N)
 * are bridged unconditionally in the engine, so it never interrupts the
 * path. Live readings (U_L-L, I_line, kW) come from the simulator's
 * `nodeResult` and are also surfaced in the property panel.
 */
const EnergyMeterSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const energized = nodeResult?.energized || false;
  const vLL = nodeResult?.lineVoltageRmsV ?? component.properties.lineVoltage ?? 0;
  const iLine = nodeResult?.lineCurrentRmsA ?? nodeResult?.currentA ?? 0;
  const pW = nodeResult?.powerW ?? 0;
  const proto = component.properties.meterProtocol ?? 'modbus_rtu';
  const meterTag =
    component.type === 'digital_multifunction_meter' ? 'MFM' : 'EM';
  const protoLabel =
    proto === 'modbus_rtu'
      ? 'MOD-RTU'
      : proto === 'modbus_tcp'
        ? 'MOD-TCP'
        : proto === 'bacnet_ip'
          ? 'BACnet'
          : '';

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
            x={minX - 4}
            y={minY - 4}
            width={bodyW + 8}
            height={bodyH + 8}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        <Rect
          x={minX}
          y={minY}
          width={bodyW}
          height={bodyH}
          fillLinearGradientStartPoint={{ x: 0, y: minY }}
          fillLinearGradientEndPoint={{ x: 0, y: maxY }}
          fillLinearGradientColorStops={
            energized
              ? [0, '#334155', 0.55, '#1F2937', 1, '#0F172A']
              : [0, '#475569', 1, '#1F2937']
          }
          stroke="#0F172A"
          strokeWidth={OUTLINE}
          cornerRadius={3}
          shadowColor="#020617"
          shadowBlur={6}
          shadowOpacity={0.25}
          shadowOffsetY={1.5}
        />
        <Rect
          x={minX + 2}
          y={minY + 2}
          width={bodyW - 4}
          height={bodyH - 4}
          stroke="#64748B"
          strokeWidth={0.6}
          cornerRadius={2}
          opacity={0.6}
          listening={false}
        />

        <Rect
          x={minX + 3}
          y={minY + 3}
          width={bodyW - 6}
          height={18}
          fill={energized ? '#0EA5E9' : '#334155'}
          stroke={energized ? '#0369A1' : '#1F2937'}
          strokeWidth={1}
          cornerRadius={2}
        />
        <Text
          text={energized ? `U ${vLL.toFixed(0)}V` : 'U  --- V'}
          x={minX + 4}
          y={minY + 6}
          width={(bodyW - 6) / 2 - 2}
          align="left"
          fontSize={9}
          fontStyle="bold"
          fill={energized ? '#FFFFFF' : '#94A3B8'}
          listening={false}
        />
        <Text
          text={energized ? `I ${iLine.toFixed(2)}A` : 'I  --- A'}
          x={minX + 4 + (bodyW - 6) / 2}
          y={minY + 6}
          width={(bodyW - 6) / 2 - 2}
          align="right"
          fontSize={9}
          fontStyle="bold"
          fill={energized ? '#FFFFFF' : '#94A3B8'}
          listening={false}
        />

        <Text
          text={energized ? `P ${fmtKw(pW)} kW` : 'P  --- kW'}
          x={minX + 3}
          y={minY + 24}
          width={bodyW - 6}
          align="center"
          fontSize={8}
          fill={energized ? '#A7F3D0' : '#9CA3AF'}
          fontStyle="bold"
          listening={false}
        />

        <Text
          text={meterTag}
          x={maxX - 18}
          y={maxY - 12}
          fontSize={8}
          fontStyle="bold"
          fill="#9CA3AF"
          listening={false}
        />
        {protoLabel && (
          <Text
            text={protoLabel}
            x={minX + 3}
            y={maxY - 12}
            fontSize={7}
            fill="#FCD34D"
            fontStyle="bold"
            listening={false}
          />
        )}

        {[-24, -8, 8, 24].map((sx) => (
          <Circle
            key={`meter-screw-top-${sx}`}
            x={sx}
            y={minY + 4}
            radius={1.2}
            fill="#94A3B8"
            listening={false}
          />
        ))}

        {component.connectionPoints.map((cp) => {
          const u = cp.label.toUpperCase();
          const isIn = u.startsWith('IN_');
          const isN = u.endsWith('_N');
          const stroke = isN
            ? '#2563EB'
            : u.endsWith('L1')
              ? '#7C3F19'
              : u.endsWith('L2')
                ? '#111827'
                : u.endsWith('L3')
                  ? '#4B5563'
                  : '#374151';
          const tag = isN ? 'N' : u.endsWith('L1') ? 'L1' : u.endsWith('L2') ? 'L2' : 'L3';
          const tagY = isIn ? cp.y + 4 : cp.y - 14;
          const stubY = isIn ? cp.y + 3 : cp.y - 3;
          return (
            <React.Fragment key={cp.id}>
              <Line
                points={[cp.x, stubY, cp.x, cp.y]}
                stroke={stroke}
                strokeWidth={2}
                lineCap="round"
              />
              <Text
                text={tag}
                x={cp.x - 10}
                y={tagY}
                width={20}
                align="center"
                fontSize={7}
                fontStyle="bold"
                fill={stroke}
                listening={false}
              />
            </React.Fragment>
          );
        })}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={minX - 4}
          y={maxY + 8}
          width={bodyW + 8}
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
            radius={4.5}
              fill="#3B82F6"
            opacity={0.7}
              stroke="#2563EB"
            strokeWidth={1.2}
            />
          ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default EnergyMeterSymbol;
