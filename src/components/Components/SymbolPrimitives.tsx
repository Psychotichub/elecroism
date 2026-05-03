import React from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import type { ConnectionPoint } from '../../types';
import { SymbolColors, SymbolMetrics } from './SymbolTokens';

type DeviceBodyProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  energized?: boolean;
  cornerRadius?: number;
};

export const DeviceBody: React.FC<DeviceBodyProps> = ({
  x,
  y,
  width,
  height,
  energized,
  cornerRadius = SymbolMetrics.bodyRadius,
}) => (
  <>
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fillLinearGradientStartPoint={{ x: 0, y }}
      fillLinearGradientEndPoint={{ x: 0, y: y + height }}
      fillLinearGradientColorStops={
        energized
          ? [0, '#FFFFFF', 0.5, SymbolColors.body, 1, SymbolColors.bodyDark]
          : [0, SymbolColors.body, 1, SymbolColors.bodyDark]
      }
      stroke={SymbolColors.bodyStroke}
      strokeWidth={SymbolMetrics.stroke}
      cornerRadius={cornerRadius}
    />
    <Rect
      x={x + 2}
      y={y + 2}
      width={Math.max(0, width - 4)}
      height={Math.max(0, height * 0.28)}
      fill="#FFFFFF"
      opacity={0.26}
      cornerRadius={Math.max(1, cornerRadius - 1)}
    />
  </>
);

type SelectionFrameProps = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const SelectionFrame: React.FC<SelectionFrameProps> = ({
  x,
  y,
  width,
  height,
}) => (
  <Rect
    x={x}
    y={y}
    width={width}
    height={height}
    stroke="#3B82F6"
    strokeWidth={2}
    dash={[4, 4]}
    cornerRadius={4}
    listening={false}
  />
);

type TerminalPocketProps = {
  x: number;
  y: number;
  leadToY: number;
  width?: number;
  height?: number;
  label?: string;
  labelY?: number;
};

export const TerminalPocket: React.FC<TerminalPocketProps> = ({
  x,
  y,
  leadToY,
  width = 8,
  height = 6,
  label,
  labelY,
}) => (
  <>
    <Rect
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      fill={SymbolColors.recess}
      stroke={SymbolColors.terminalDark}
      strokeWidth={SymbolMetrics.detailStroke}
      cornerRadius={1.4}
      listening={false}
    />
    <Circle
      x={x}
      y={y}
      radius={SymbolMetrics.screwRadius}
      fill={SymbolColors.screw}
      listening={false}
    />
    <Line
      points={[x, y + Math.sign(leadToY - y) * (height / 2), x, leadToY]}
      stroke={SymbolColors.bodyStroke}
      strokeWidth={1.7}
      lineCap="round"
      listening={false}
    />
    {label && labelY != null && (
      <Text
        text={label}
        x={x - 8}
        y={labelY}
        width={16}
        align="center"
        fontSize={6}
        fontStyle="bold"
        fill={SymbolColors.labelMuted}
        listening={false}
      />
    )}
  </>
);

type BreakerHandleProps = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  state: 'on' | 'off' | 'tripped';
  flashVisible?: boolean;
};

export const BreakerHandle: React.FC<BreakerHandleProps> = ({
  x,
  y,
  width = 9,
  height = 17,
  state,
  flashVisible = true,
}) => {
  const fill =
    state === 'tripped'
      ? flashVisible
        ? SymbolColors.trip
        : SymbolColors.tripDark
      : state === 'on'
        ? SymbolColors.on
        : SymbolColors.off;
  const leverOffset = state === 'on' ? -2 : state === 'off' ? 2 : 0;

  return (
    <Group listening={false}>
      <Rect
        x={x - width / 2 - 1}
        y={y - height / 2 - 1}
        width={width + 2}
        height={height + 2}
        fill="#CBD5E1"
        stroke="#64748B"
        strokeWidth={0.7}
        cornerRadius={2}
      />
      <Rect
        x={x - width / 2}
        y={y - height / 2 + leverOffset}
        width={width}
        height={height}
        fill={fill}
        cornerRadius={2}
      />
      <Rect
        x={x - width / 2 + 1}
        y={y - height / 2 + leverOffset + 1}
        width={width - 2}
        height={3}
        fill="#FFFFFF"
        opacity={0.25}
        cornerRadius={1}
      />
      <Line
        points={[x - width / 2 + 2, y + leverOffset + 1, x + width / 2 - 2, y + leverOffset + 1]}
        stroke="#111827"
        strokeWidth={0.8}
        opacity={0.35}
      />
    </Group>
  );
};

type TripFlagProps = {
  x: number;
  y: number;
  visible: boolean;
  flashVisible?: boolean;
};

export const TripFlag: React.FC<TripFlagProps> = ({
  x,
  y,
  visible,
  flashVisible = true,
}) => {
  if (!visible) return null;
  return (
    <Circle
      x={x}
      y={y}
      radius={3}
      fill={SymbolColors.trip}
      opacity={flashVisible ? 1 : 0.3}
      stroke="#991B1B"
      strokeWidth={0.7}
      listening={false}
    />
  );
};

type RatingStripProps = {
  x: number;
  y: number;
  width: number;
  title: string;
  rating?: string;
  detail?: string;
};

export const RatingStrip: React.FC<RatingStripProps> = ({
  x,
  y,
  width,
  title,
  rating,
  detail,
}) => (
  <>
    <Rect
      x={x}
      y={y}
      width={width}
      height={20}
      fill="#F8FAFC"
      stroke="#CBD5E1"
      strokeWidth={0.7}
      cornerRadius={2}
      listening={false}
    />
    <Text
      text={title}
      x={x + 2}
      y={y + 2}
      width={width - 4}
      align="center"
      fontSize={7}
      fontStyle="bold"
      fill={SymbolColors.label}
      listening={false}
    />
    {rating && (
      <Text
        text={rating}
        x={x + 2}
        y={y + 10}
        width={width - 4}
        align="center"
        fontSize={7}
        fill={SymbolColors.labelMuted}
        listening={false}
      />
    )}
    {detail && (
      <Text
        text={detail}
        x={x + 2}
        y={y + 17}
        width={width - 4}
        align="center"
        fontSize={5}
        fill="#94A3B8"
        listening={false}
      />
    )}
  </>
);

type ConnectionPointDotsProps = {
  connectionPoints: ConnectionPoint[];
  radius?: number;
};

export const ConnectionPointDots: React.FC<ConnectionPointDotsProps> = ({
  connectionPoints,
  radius = 5,
}) => (
  <>
    {connectionPoints.map((cp) => (
      <Circle
        key={cp.id}
        x={cp.x}
        y={cp.y}
        radius={radius}
        fill="#3B82F6"
        opacity={0.62}
        stroke="#2563EB"
        strokeWidth={1}
      />
    ))}
  </>
);

type StatusLedProps = {
  x: number;
  y: number;
  active?: boolean;
  color?: string;
  label?: string;
};

export const StatusLed: React.FC<StatusLedProps> = ({
  x,
  y,
  active,
  color = SymbolColors.on,
  label,
}) => (
  <>
    <Circle
      x={x}
      y={y}
      radius={2.5}
      fill={active ? color : '#94A3B8'}
      stroke="#475569"
      strokeWidth={0.6}
      opacity={active ? 0.95 : 0.55}
      listening={false}
    />
    {active && (
      <Circle
        x={x}
        y={y}
        radius={5}
        fill={color}
        opacity={0.16}
        listening={false}
      />
    )}
    {label && (
      <Text
        text={label}
        x={x + 4}
        y={y - 3}
        fontSize={5}
        fill={SymbolColors.labelMuted}
        listening={false}
      />
    )}
  </>
);

type DisplayWindowProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  active?: boolean;
};

export const DisplayWindow: React.FC<DisplayWindowProps> = ({
  x,
  y,
  width,
  height,
  text,
  active,
}) => (
  <>
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={active ? '#DCFCE7' : '#D1D5DB'}
      stroke="#64748B"
      strokeWidth={0.8}
      cornerRadius={2}
      listening={false}
    />
    {text && (
      <Text
        text={text}
        x={x + 2}
        y={y + Math.max(1, height / 2 - 4)}
        width={width - 4}
        align="center"
        fontSize={Math.min(7, Math.max(5, height - 4))}
        fontStyle="bold"
        fill={active ? '#166534' : '#475569'}
        listening={false}
      />
    )}
  </>
);

type VentSlotsProps = {
  x: number;
  y: number;
  count?: number;
  width?: number;
  gap?: number;
};

export const VentSlots: React.FC<VentSlotsProps> = ({
  x,
  y,
  count = 4,
  width = 14,
  gap = 3,
}) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <Line
        key={i}
        points={[x, y + i * gap, x + width, y + i * gap]}
        stroke="#94A3B8"
        strokeWidth={0.8}
        lineCap="round"
        opacity={0.8}
        listening={false}
      />
    ))}
  </>
);

type PhaseTagProps = {
  x: number;
  y: number;
  text: string;
  color?: string;
};

export const PhaseTag: React.FC<PhaseTagProps> = ({
  x,
  y,
  text,
  color = SymbolColors.live,
}) => (
  <Text
    text={text}
    x={x - 6}
    y={y}
    width={12}
    align="center"
    fontSize={6}
    fontStyle="bold"
    fill={color}
    listening={false}
  />
);

type FaceplateLabelProps = {
  x: number;
  y: number;
  text: string;
  width?: number;
  fontSize?: number;
  muted?: boolean;
};

/** Small printed legend on device faceplate. */
export const FaceplateLabel: React.FC<FaceplateLabelProps> = ({
  x,
  y,
  text,
  width = 48,
  fontSize = 6,
  muted = true,
}) => (
  <Text
    text={text}
    x={x}
    y={y}
    width={width}
    align="center"
    fontSize={fontSize}
    fill={muted ? SymbolColors.labelMuted : SymbolColors.label}
    listening={false}
  />
);

type DinRailClipProps = {
  x: number;
  y: number;
  width: number;
};

/** Hint of DIN-rail foot under modular device. */
export const DinRailClip: React.FC<DinRailClipProps> = ({ x, y, width }) => (
  <Rect
    x={x}
    y={y}
    width={width}
    height={3}
    fill={SymbolColors.terminalDark}
    stroke={SymbolColors.bodyStroke}
    strokeWidth={SymbolMetrics.detailStroke}
    cornerRadius={1}
    opacity={0.55}
    listening={false}
  />
);
