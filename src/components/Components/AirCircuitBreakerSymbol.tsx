import React from 'react';
import { useTripFlash } from '../../hooks/useTripFlash';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onReset: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/** 4P incomer-style layout: L1–L3 + N (same terminal grid as 4P MCB, wider body). */
const poleXs = [-30, -10, 10, 30];
const minX = -38;
const maxX = 38;
const bodyW = maxX - minX;
/** Left column BMS control CPs + on-canvas labels; selection must include them. */
const selectionMinX = -100;
const selectionW = maxX - selectionMinX + 8;

function isControlOrAuxTerminal(label: string): boolean {
  const u = label.toUpperCase().trim();
  return /^(CC_|ST_|UVR_|AUX_)/.test(u);
}

const AirCircuitBreakerSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onReset,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const flashVisible = useTripFlash(isTripped, 500);
  const ir = component.properties.ratingAmps ?? 630;
  const ii = component.properties.acbInstantaneousMult ?? 10;
  const st = component.properties.acbShortTimeMult ?? 6;
  const gOn = component.properties.acbEarthFaultEnabled ?? false;
  const ig = component.properties.acbEarthFaultAmps ?? 0;
  const bms = component.properties.acbBmsEnabled ?? false;
  const uvrOff =
    bms && component.properties.acbBmsUvrEnergized === false;
  const springOut =
    bms && component.properties.acbBmsSpringCharged === false;
  const proto = component.properties.acbBmsProtocol ?? 'none';
  const kCc = component.properties.acbRelayCcId ?? 'K1';
  const kSt = component.properties.acbRelayStId ?? 'K2';
  const fuseRef = component.properties.acbCtrlFuseDesignation ?? 'F1';
  const fuseA = component.properties.acbCtrlFuseAmps ?? 2;
  const bodyBottomY = 36;
  const leadEndY = 42;

  const handleColor = isTripped
    ? flashVisible
      ? '#EF4444'
      : '#7F1D1D'
    : uvrOff
      ? '#F97316'
      : isOn
        ? '#22C55E'
        : '#9CA3AF';

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
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (isTripped) onReset();
        else onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
      {selected && (
        <Rect
          x={selectionMinX}
          y={-36}
          width={selectionW}
          height={104}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={minX}
        y={-30}
        width={bodyW}
        height={bodyBottomY + 30}
        fill={energized ? '#EFF6FF' : '#E5E7EB'}
        stroke="#1E3A5F"
        strokeWidth={2}
        cornerRadius={3}
      />

      <Text
        text="ACB"
        x={minX + 4}
        y={-26}
        width={bodyW - 8}
        fontSize={9}
        fill="#1E3A5F"
        fontStyle="bold"
        align="center"
        listening={false}
      />

      {poleXs.map((dx) => (
        <Rect
          key={dx}
          x={dx - 4}
          y={-14}
          width={8}
          height={12}
          fill={handleColor}
          cornerRadius={1}
        />
      ))}

      <Text
        text={`Ir ${ir}A · Ii ${ii}× · ST ${st}×`}
        x={minX + 4}
        y={0}
        width={bodyW - 8}
        fontSize={7}
        fill="#4B5563"
        align="center"
        listening={false}
      />

      <Text
        text={
          gOn && ig > 0
            ? `G: ON · Ig≥${ig}A`
            : 'G: OFF'
        }
        x={minX + 4}
        y={11}
        width={bodyW - 8}
        fontSize={7}
        fill={gOn ? '#0369A1' : '#9CA3AF'}
        align="center"
        listening={false}
      />

      {bms && (
        <>
          <Text
            text={
              uvrOff
                ? 'BMS · UVR out'
                : springOut
                  ? 'BMS · spring'
                  : proto !== 'none'
                    ? `BMS · ${proto.replace('modbus_', 'MB ').replace('bacnet_', 'BC ')}`
                    : 'BMS'
            }
            x={minX + 4}
            y={20}
            width={bodyW - 8}
            fontSize={6}
            fill={uvrOff ? '#C2410C' : '#6B21A8'}
            align="center"
            listening={false}
          />
          <Text
            text={`${kCc}/${kSt} · ${fuseRef} ${fuseA}A`}
            x={minX + 4}
            y={28}
            width={bodyW - 8}
            fontSize={5}
            fill="#4C1D95"
            align="center"
            listening={false}
          />
        </>
      )}

      {poleXs.map((dx) => (
        <React.Fragment key={`lead-${dx}`}>
          <Line
            points={[dx, -30, dx, -36]}
            stroke="#374151"
            strokeWidth={2}
          />
          <Line
            points={[dx, bodyBottomY, dx, leadEndY]}
            stroke="#374151"
            strokeWidth={2}
          />
        </React.Fragment>
      ))}

      {isTripped && (
        <Circle
          x={0}
          y={-8}
          radius={4}
          fill="#EF4444"
          opacity={flashVisible ? 1 : 0.35}
        />
      )}

      <ComponentCanvasLabel
          componentId={component.id}
        label={component.label}
        x={minX - 6}
        y={52}
        width={bodyW + 12}
        fontSize={component.properties.labelFontSize ?? 7}
                offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

      {component.connectionPoints
        .filter((cp) => isControlOrAuxTerminal(cp.label))
        .map((cp) => (
          <Line
            key={`cp-stub-${cp.id}`}
            points={[minX, cp.y, cp.x, cp.y]}
            stroke="#3730A3"
            strokeWidth={1.2}
            lineCap="round"
            listening={false}
          />
        ))}

      {component.connectionPoints
        .filter((cp) => isControlOrAuxTerminal(cp.label))
        .map((cp) => (
          <Text
            key={`cp-lbl-${cp.id}`}
            x={cp.x - 56}
            y={cp.y - 6}
            width={52}
            height={12}
            text={cp.label}
            fontSize={5.5}
            fontStyle="italic"
            fill="#3730A3"
            align="right"
            verticalAlign="middle"
            listening={false}
          />
        ))}

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

export default AirCircuitBreakerSymbol;
