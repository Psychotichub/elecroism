import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

function coilTerminalTag(label: string): 'A1' | 'A2' | null {
  const u = label.toUpperCase();
  if (u === 'A1' || u === 'COIL_A') return 'A1';
  if (u === 'A2' || u === 'COIL_B') return 'A2';
  return null;
}

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ControlSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const isContactor = component.type === 'contactor';
  const isTimer = component.type === 'timer';

  const getLabel = () => {
    switch (component.type) {
      case 'contactor':
        return 'KM';
      case 'relay':
        return 'KA';
      case 'smart_relay':
        return 'SR';
      case 'timer':
        return 'KT';
      case 'overload_relay':
        return 'OL';
      case 'shunt_trip_coil':
        return 'SHT';
      case 'closing_coil':
        return 'CC';
      case 'uvr_release':
        return 'UVR';
      case 'motor_operator_kit':
        return 'MOT';
      default:
        return '?';
    }
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
          x={-22}
          y={-30}
          width={44}
          height={isContactor || isTimer ? 86 : 60}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
          cornerRadius={4}
        />
      )}

      <Rect
        x={-18}
        y={-25}
        width={36}
        height={50}
        fillLinearGradientStartPoint={{ x: 0, y: -25 }}
        fillLinearGradientEndPoint={{ x: 0, y: 25 }}
        fillLinearGradientColorStops={
          energized
            ? [0, '#F8FAFC', 0.5, '#ECFDF5', 1, '#DCFCE7']
            : [0, '#F8FAFC', 1, '#E5E7EB']
        }
        stroke="#374151"
        strokeWidth={OUTLINE}
        cornerRadius={4}
        shadowColor="#0F172A"
        shadowBlur={4}
        shadowOpacity={0.2}
        shadowOffsetY={1}
      />

      <Rect
        x={-14}
        y={-8}
        width={28}
        height={16}
        fill="transparent"
        stroke="#374151"
        strokeWidth={1}
      />

      <Text
        text={getLabel()}
        x={-8}
        y={-6}
        fontSize={10}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />

      <Circle
        x={10}
        y={-18}
        radius={3}
        fill={isOn ? '#22C55E' : '#9CA3AF'}
      />

      <ComponentCanvasLabel
          componentId={component.id}
        label={component.label}
        x={-22}
        y={12}
        width={44}
        fontSize={component.properties.labelFontSize ?? 7}
        offsetX={component.properties.labelOffsetX ?? 0}
        offsetY={component.properties.labelOffsetY ?? 0}
      />

      <Line points={[0, -25, 0, -30]} stroke="#374151" strokeWidth={2} />
      <Line points={[0, 25, 0, 30]} stroke="#374151" strokeWidth={2} />
      <Line points={[-18, 0, -24, 0]} stroke="#374151" strokeWidth={1.5} />
      <Line points={[18, 0, 24, 0]} stroke="#374151" strokeWidth={1.5} />

      {isContactor && (
        <>
          <Rect
            x={-18}
            y={32}
            width={36}
            height={24}
            fill={isOn ? '#F0FDF4' : '#F9FAFB'}
            stroke="#9CA3AF"
            strokeWidth={1}
            cornerRadius={2}
            dash={[3, 2]}
          />

          <Line points={[-12, 38, -12, 35]} stroke="#374151" strokeWidth={1.5} />
          <Line points={[-12, 50, -12, 53]} stroke="#374151" strokeWidth={1.5} />
          {isOn ? (
            <Line
              points={[-12, 38, -12, 50]}
              stroke="#22C55E"
              strokeWidth={1.5}
            />
          ) : (
            <>
              <Line
                points={[-12, 38, -12, 42]}
                stroke="#374151"
                strokeWidth={1.2}
              />
              <Line
                points={[-12, 46, -8, 50]}
                stroke="#374151"
                strokeWidth={1.2}
              />
            </>
          )}
          <Text
            text="13"
            x={-22}
            y={32}
            width={20}
            fontSize={6}
            fill="#111827"
            align="right"
            listening={false}
          />
          <Text
            text="14"
            x={-22}
            y={50}
            width={20}
            fontSize={6}
            fill="#111827"
            align="right"
            listening={false}
          />

          <Line points={[12, 38, 12, 35]} stroke="#374151" strokeWidth={1.5} />
          <Line points={[12, 50, 12, 53]} stroke="#374151" strokeWidth={1.5} />
          {isOn ? (
            <>
              <Line
                points={[12, 38, 12, 42]}
                stroke="#374151"
                strokeWidth={1.2}
              />
              <Line
                points={[12, 46, 16, 50]}
                stroke="#374151"
                strokeWidth={1.2}
              />
            </>
          ) : (
            <Line
              points={[12, 38, 12, 50]}
              stroke="#22C55E"
              strokeWidth={1.5}
            />
          )}
          <Text
            text="21"
            x={2}
            y={32}
            width={20}
            fontSize={6}
            fill="#111827"
            align="left"
            listening={false}
          />
          <Text
            text="22"
            x={2}
            y={50}
            width={20}
            fontSize={6}
            fill="#111827"
            align="left"
            listening={false}
          />

          <Text
            text="NO"
            x={-18}
            y={43}
            width={12}
            fontSize={5}
            fill="#6B7280"
            align="center"
            listening={false}
          />
          <Text
            text="NC"
            x={6}
            y={43}
            width={12}
            fontSize={5}
            fill="#6B7280"
            align="center"
            listening={false}
          />
        </>
      )}

      {isTimer && (
        <>
          <Rect
            x={-18}
            y={32}
            width={36}
            height={24}
            fill={isOn ? '#F0FDF4' : '#F9FAFB'}
            stroke="#9CA3AF"
            strokeWidth={1}
            cornerRadius={2}
            dash={[3, 2]}
          />
          <Text
            text="T"
            x={-15}
            y={34}
            width={8}
            fontSize={7}
            fontStyle="bold"
            fill="#374151"
            listening={false}
          />

          <Line points={[-12, 44, -12, 35]} stroke="#374151" strokeWidth={1.5} />
          <Line points={[12, 38, 12, 35]} stroke="#374151" strokeWidth={1.5} />
          <Line points={[12, 50, 12, 53]} stroke="#374151" strokeWidth={1.5} />

          {isOn ? (
            <>
              <Line points={[-12, 44, 8, 38]} stroke="#22C55E" strokeWidth={1.5} />
              <Line points={[-12, 44, 6, 49]} stroke="#9CA3AF" strokeWidth={1.1} />
            </>
          ) : (
            <>
              <Line points={[-12, 44, 8, 50]} stroke="#22C55E" strokeWidth={1.5} />
              <Line points={[-12, 44, 6, 39]} stroke="#9CA3AF" strokeWidth={1.1} />
            </>
          )}

          <Text
            text="15"
            x={-24}
            y={38}
            width={12}
            fontSize={6}
            fill="#111827"
            align="right"
            listening={false}
          />
          <Text
            text="18"
            x={2}
            y={31}
            width={16}
            fontSize={6}
            fill="#111827"
            align="left"
            listening={false}
          />
          <Text
            text="16"
            x={2}
            y={49}
            width={16}
            fontSize={6}
            fill="#111827"
            align="left"
            listening={false}
          />
          <Text
            text="COM"
            x={-27}
            y={46}
            width={16}
            fontSize={4.5}
            fill="#6B7280"
            align="right"
            listening={false}
          />
          <Text
            text="NO"
            x={10}
            y={31}
            width={12}
            fontSize={4.5}
            fill="#6B7280"
            align="left"
            listening={false}
          />
          <Text
            text="NC"
            x={10}
            y={49}
            width={12}
            fontSize={4.5}
            fill="#6B7280"
            align="left"
            listening={false}
          />
        </>
      )}

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

      {component.connectionPoints.map((cp) => {
        const tag = coilTerminalTag(cp.label);
        if (!tag) return null;
        return (
          <Text
            key={`${cp.id}-coil-tag`}
            text={tag}
            x={cp.x - 11}
            y={cp.y - 16}
            width={22}
            fontSize={9}
            fill="#111827"
            fontStyle="bold"
            align="center"
            listening={false}
          />
        );
      })}

      {component.connectionPoints.map((cp) => {
        if (coilTerminalTag(cp.label)) return null;
        const upper = cp.label.toUpperCase();
        // Timer face already renders dedicated IEC+functional labels for these.
        if (isTimer && (upper === 'COM' || upper === 'NO' || upper === 'NC')) {
          return null;
        }
        return (
          <Text
            key={`${cp.id}-term-label`}
            text={cp.label}
            x={cp.x - 14}
            y={cp.y + 7}
            width={28}
            fontSize={6}
            fill="#374151"
            align="center"
            listening={false}
          />
        );
      })}

      </ScaledSymbolInner>
    </Group>
  );
};

export default ControlSymbol;
