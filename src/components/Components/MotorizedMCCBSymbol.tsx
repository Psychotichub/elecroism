import React, { useEffect, useState } from 'react';
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

const selectionMinX = -100;

function isControlTerminal(label: string): boolean {
  const u = label.toUpperCase().trim();
  return /^(MOT_|ST_|AUX_|TRIP_)/.test(u);
}

const MotorizedMCCBSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onReset,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const bms = component.properties.mccbBmsEnabled ?? false;
  const ctrlBad =
    bms && component.properties.mccbBmsCtrlVoltageOk === false;
  const mechBad =
    bms && component.properties.mccbBmsMotorReady === false;
  const proto = component.properties.mccbBmsProtocol ?? 'none';
  const kMot = component.properties.mccbRelayMotorId ?? 'K1';
  const kSt = component.properties.mccbRelayStId ?? 'K2';
  const fuseRef = component.properties.mccbCtrlFuseDesignation ?? 'F1';
  const fuseA = component.properties.mccbCtrlFuseAmps ?? 2;

  const is4P = component.type === 'four_pole_motorized_mccb';
  const poleXs = is4P ? [-30, -10, 10, 30] : [-20, 0, 20];
  const minX = Math.min(...poleXs) - 6;
  const maxX = Math.max(...poleXs) + 6;
  const bodyW = maxX - minX;
  const selectionW = maxX - selectionMinX + 8;

  useEffect(() => {
    if (!isTripped) return;
    const interval = setInterval(() => setFlashVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isTripped]);

  const handleColor = isTripped
    ? flashVisible
      ? '#EF4444'
      : '#7F1D1D'
    : ctrlBad
      ? '#F97316'
      : isOn
        ? '#22C55E'
        : '#9CA3AF';

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
            y={-32}
            width={selectionW}
            height={88}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        <Rect
          x={minX}
          y={-25}
          width={bodyW}
          height={50}
          fill={energized ? '#ECFDF5' : '#E5E7EB'}
          stroke="#065F46"
          strokeWidth={1.5}
          cornerRadius={4}
        />

        <Text
          text={is4P ? '4P MCCB' : 'MCCB'}
          x={minX + 2}
          y={-22}
          width={bodyW - 4}
          fontSize={8}
          fill="#065F46"
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
            cornerRadius={2}
          />
        ))}

        <Text
          text={`${component.properties.ratingAmps || 63}A · ${
            component.properties.tripCurve || 'C'
          }`}
          x={minX + 4}
          y={2}
          width={bodyW - 8}
          fontSize={7}
          fill="#4B5563"
          align="center"
          listening={false}
        />

        {bms && (
          <>
            <Text
              text={
                ctrlBad
                  ? 'BMS · no ctrl V'
                  : mechBad
                    ? 'BMS · mech'
                    : proto !== 'none'
                      ? `BMS · ${proto.replace('modbus_', 'MB ').replace('bacnet_', 'BC ')}`
                      : 'BMS'
              }
              x={minX + 2}
              y={12}
              width={bodyW - 4}
              fontSize={6}
              fill={ctrlBad ? '#C2410C' : '#047857'}
              align="center"
              listening={false}
            />
            <Text
              text={`${kMot}/${kSt} · ${fuseRef} ${fuseA}A`}
              x={minX + 2}
              y={20}
              width={bodyW - 4}
              fontSize={5}
              fill="#065F46"
              align="center"
              listening={false}
            />
          </>
        )}

        {poleXs.map((dx) => (
          <React.Fragment key={`lead-${dx}`}>
            <Line
              points={[dx, -25, dx, -30]}
              stroke="#374151"
              strokeWidth={2}
            />
            <Line
              points={[dx, 25, dx, 30]}
              stroke="#374151"
              strokeWidth={2}
            />
          </React.Fragment>
        ))}

        {isTripped && (
          <Circle
            x={0}
            y={-16}
            radius={3}
            fill="#EF4444"
            opacity={flashVisible ? 1 : 0.3}
          />
        )}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={minX - 4}
          y={36}
          width={bodyW + 8}
          fontSize={component.properties.labelFontSize ?? 8}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

        {component.connectionPoints
          .filter((cp) => isControlTerminal(cp.label))
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
              fill="#14532D"
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

export default MotorizedMCCBSymbol;
