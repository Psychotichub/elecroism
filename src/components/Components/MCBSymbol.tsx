import React from 'react';
import { useTripFlash } from '../../hooks/useTripFlash';
import { Group, Line, Rect, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { mcbLayoutPoles } from '../../store/circuitConnectionGeometry';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';
import {
  BreakerHandle,
  ConnectionPointDots,
  DeviceBody,
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

const MCBSymbol: React.FC<Props> = ({
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

  const is2P = mcbLayoutPoles(component) === 2;

  const bodyW = is2P ? 40 : 30;
  const bodyH = 56;
  const poleXs = is2P ? [-10, 10] : [0];
  const topLabels = is2P ? ['1', '3'] : ['1'];
  const bottomLabels = is2P ? ['2', '4'] : ['2'];
  const handleState = isTripped ? 'tripped' : isOn ? 'on' : 'off';
  const rating = `${component.properties.tripCurve || 'C'}${component.properties.ratingAmps || 16}`;

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
          x={-bodyW / 2 - 5}
          y={-bodyH / 2 - 7}
          width={bodyW + 10}
          height={bodyH + 23}
        />
      )}

      <DeviceBody
        x={-bodyW / 2}
        y={-bodyH / 2}
        width={bodyW}
        height={bodyH}
        energized={energized}
      />

      {is2P && (
        <Line
          points={[0, -bodyH / 2 + 4, 0, bodyH / 2 - 4]}
          stroke="#CBD5E1"
          strokeWidth={0.8}
          listening={false}
        />
      )}

      {poleXs.map((x, index) => (
        <React.Fragment key={x}>
          <TerminalPocket
            x={x}
            y={-27}
            leadToY={-32}
            label={topLabels[index]}
            labelY={-40}
          />
          <TerminalPocket
            x={x}
            y={27}
            leadToY={32}
            label={bottomLabels[index]}
            labelY={34}
          />
          <BreakerHandle
            x={x}
            y={-15}
            width={8}
            height={17}
            state={handleState}
            flashVisible={flashVisible}
          />
        </React.Fragment>
      ))}

      <RatingStrip
        x={-bodyW / 2 + 4}
        y={3}
        width={bodyW - 8}
        title="MCB"
        rating={rating}
        detail={is2P ? '2P' : '1P'}
      />

      {energized && (
        <Rect
          x={-bodyW / 2 + 3}
          y={-bodyH / 2 + 3}
          width={bodyW - 6}
          height={3}
          fill={SymbolColors.live}
          opacity={0.28}
          cornerRadius={2}
          listening={false}
        />
      )}

      {isTripped && (
        <Text
          text="TRIP"
          x={-bodyW / 2 + 4}
          y={-2}
          width={bodyW - 8}
          align="center"
          fontSize={6}
          fontStyle="bold"
          fill={SymbolColors.trip}
          listening={false}
        />
      )}

      <TripFlag
        x={is2P ? -bodyW / 2 + 7 : 0}
        y={-22}
        visible={isTripped}
        flashVisible={flashVisible}
      />

      <ComponentCanvasLabel
        componentId={component.id}
        label={component.label}
        x={-bodyW / 2 - 10}
        y={42}
        width={bodyW + 20}
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

export default MCBSymbol;
