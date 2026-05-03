import React, { useEffect, useState } from 'react';
import { Circle, Group, Line, Text } from 'react-konva';
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
import { SymbolColors, SymbolMetrics } from './SymbolTokens';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onReset: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const BreakerSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  onReset,
  showConnectionPoints,
  selected,
}) => {
  const [flashVisible, setFlashVisible] = useState(true);
  const isTripped = component.state === 'tripped';
  const isOn = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const poles = component.properties.poles ?? 2;
  const poleXs = poles >= 4 ? [-30, -10, 10, 30] : [-10, 10];
  const bodyWidth = poles >= 4 ? 68 : 40;
  const bodyX = -bodyWidth / 2;
  const bodyY = -26;
  const bodyH = 52;

  useEffect(() => {
    if (!isTripped) return;
    const interval = setInterval(() => setFlashVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [isTripped]);

  const handleState = isTripped ? 'tripped' : isOn ? 'on' : 'off';
  const title =
    component.type === 'residual_current_circuit_breaker' ? 'RCCB' : 'RCD';
  const rcdType = component.properties.rcdType ?? 'A';
  const rcdTripMs = component.properties.rcdTripTimeMs ?? 30;
  const sens = component.properties.rcdSensitivity ?? 30;

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
        if (isTripped) {
          onReset();
        } else {
          onToggle();
        }
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <SelectionFrame
            x={bodyX - 4}
            y={-32}
            width={bodyWidth + 8}
            height={72}
          />
        )}

        <DeviceBody
          x={bodyX}
          y={bodyY}
          width={bodyWidth}
          height={bodyH}
          energized={energized}
        />

        {poleXs.map((x, i) => (
          <React.Fragment key={`rcd-${x}`}>
            <TerminalPocket
              x={x}
              y={-27}
              leadToY={-25}
              label={String(i * 2 + 1)}
              labelY={-46}
            />
            <TerminalPocket
              x={x}
              y={27}
              leadToY={25}
              label={String(i * 2 + 2)}
              labelY={36}
            />
            <BreakerHandle
              x={x}
              y={-16}
              width={7}
              height={13}
              state={handleState}
              flashVisible={flashVisible}
            />
          </React.Fragment>
        ))}

        {poleXs.length > 1 && (
          <Line
            points={[poleXs[0], -14, poleXs[poleXs.length - 1], -14]}
            stroke="#475569"
            strokeWidth={1}
            opacity={0.4}
            lineCap="round"
            listening={false}
          />
        )}

        <RatingStrip
          x={bodyX + 5}
          y={6}
          width={bodyWidth - 10}
          title={title}
          rating={`${sens} mA`}
          detail={`Type ${rcdType} · ${rcdTripMs} ms`}
        />

        <DinRailClip x={bodyX + 8} y={27} width={bodyWidth - 16} />

        {energized && (
          <Line
            points={[bodyX + 4, -22, bodyX + bodyWidth - 4, -22]}
            stroke={SymbolColors.live}
            strokeWidth={2}
            opacity={0.32}
            lineCap="round"
            listening={false}
          />
        )}

        <TripFlag
          x={bodyX + 10}
          y={-22}
          visible={isTripped}
          flashVisible={flashVisible}
        />

        <Circle
          x={0}
          y={18}
          radius={4}
          fill={SymbolColors.recess}
          stroke={SymbolColors.terminalDark}
          strokeWidth={SymbolMetrics.detailStroke}
        />
        <Text
          text="T"
          x={-3}
          y={14}
          fontSize={6}
          fill={SymbolColors.labelMuted}
          listening={false}
        />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={bodyX - 6}
          y={34}
          width={bodyWidth + 12}
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

export default BreakerSymbol;
