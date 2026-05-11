import React from 'react';
import { useTripFlash } from '../../hooks/useTripFlash';
import { Group, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';
import {
  BreakerHandle,
  ConnectionPointDots,
  DeviceBody,
  DinRailClip,
  RatingStrip,
  SelectionFrame,
  TerminalPocket,
  TripFlag,
} from './SymbolPrimitives';
import { SymbolColors } from './SymbolTokens';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ThreePhaseMCBSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const flashVisible = useTripFlash(isTripped, 500);
  const is4P = component.type === 'four_phase_mcb';
  const poleXs = is4P ? [-30, -10, 10, 30] : [-20, 0, 20];
  const minX = Math.min(...poleXs) - 6;
  const maxX = Math.max(...poleXs) + 6;
  const bodyW = maxX - minX;
  const bodyH = 52;
  const bodyY = -26;

  const handleState = isTripped ? 'tripped' : isOn ? 'on' : 'off';
  const title =
    component.type === 'motor_protection_circuit_breaker'
      ? 'MPCB'
      : component.type === 'mccb'
        ? 'MCCB'
        : is4P
          ? '4P MCB'
          : '3P MCB';
  const rating = `${component.properties.ratingAmps || 16}A`;
  const curve = component.properties.tripCurve
    ? String(component.properties.tripCurve)
    : undefined;

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
        if (!isTripped) onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <SelectionFrame
            x={minX - 5}
            y={-34}
            width={bodyW + 10}
            height={88}
          />
        )}

        <DeviceBody
          x={minX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          energized={energized}
        />

        {poleXs.map((dx, i) => (
          <React.Fragment key={`tp-${dx}`}>
            <TerminalPocket
              x={dx}
              y={-27}
              leadToY={-25}
              label={String(i * 2 + 1)}
              labelY={-48}
            />
            <TerminalPocket
              x={dx}
              y={27}
              leadToY={25}
              label={String(i * 2 + 2)}
              labelY={36}
            />
            <BreakerHandle
              x={dx}
              y={-16}
              width={8}
              height={14}
              state={handleState}
              flashVisible={flashVisible}
            />
          </React.Fragment>
        ))}

        <Line
          points={[poleXs[0], -15, poleXs[poleXs.length - 1], -15]}
          stroke="#475569"
          strokeWidth={1.2}
          opacity={0.45}
          lineCap="round"
          listening={false}
        />

        <RatingStrip
          x={minX + 6}
          y={8}
          width={bodyW - 12}
          title={title}
          rating={rating}
          detail={curve}
        />

        <DinRailClip x={minX + 8} y={28} width={bodyW - 16} />

        {energized && (
          <Group listening={false}>
            <Line
              points={[minX + 4, -22, minX + bodyW - 4, -22]}
              stroke={SymbolColors.live}
              strokeWidth={2}
              opacity={0.35}
              lineCap="round"
            />
          </Group>
        )}

        {isTripped && (
          <Text
            text="TRIP"
            x={minX + 4}
            y={-4}
            width={bodyW - 8}
            align="center"
            fontSize={6}
            fontStyle="bold"
            fill={SymbolColors.trip}
            listening={false}
          />
        )}

        <TripFlag
          x={minX + 10}
          y={-22}
          visible={isTripped}
          flashVisible={flashVisible}
        />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={minX - 4}
          y={34}
          width={bodyW + 8}
          fontSize={component.properties.labelFontSize ?? 7}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

        {showConnectionPoints && (
          <ConnectionPointDots connectionPoints={component.connectionPoints} />
        )}
      </ScaledSymbolInner>
    </Group>
  );
};

export default ThreePhaseMCBSymbol;
