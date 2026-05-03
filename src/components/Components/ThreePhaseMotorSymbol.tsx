import React, { useEffect, useRef } from 'react';
import { Group, Circle, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import Konva from 'konva';
import { startKonvaLayerAnimation } from '../../utils/konvaLayerAnimation';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import {
  ConnectionPointDots,
  DeviceBody,
  SelectionFrame,
  TerminalPocket,
} from './SymbolPrimitives';
import { SymbolColors } from './SymbolTokens';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const ThreePhaseMotorSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const isFault = component.state === 'fault';
  const rotorRef = useRef<Konva.Group>(null);

  useEffect(() => {
    if (!energized || isFault) return;
    const anim = startKonvaLayerAnimation(rotorRef.current, (frame) => {
      if (frame && rotorRef.current) {
        rotorRef.current.rotation(frame.time * 0.08);
      }
    });
    if (!anim) return;
    return () => {
      anim.stop();
    };
  }, [energized, isFault]);

  const fill = isFault ? '#FECACA' : energized ? '#4ADE80' : '#E5E7EB';
  const stroke = isFault ? SymbolColors.trip : SymbolColors.bodyStroke;

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
          <SelectionFrame x={-26} y={-28} width={56} height={58} />
        )}

        <DeviceBody
          x={-22}
          y={-24}
          width={44}
          height={48}
          cornerRadius={18}
          energized={energized && !isFault}
        />

        <TerminalPocket
          x={-20}
          y={-19}
          leadToY={-22}
          label="L1"
          labelY={-28}
        />
        <TerminalPocket
          x={0}
          y={-19}
          leadToY={-22}
          label="L2"
          labelY={-28}
        />
        <TerminalPocket
          x={20}
          y={-19}
          leadToY={-22}
          label="L3"
          labelY={-28}
        />
        <TerminalPocket
          x={0}
          y={19}
          leadToY={22}
          label="N"
          labelY={28}
        />

        <Circle
          x={0}
          y={0}
          radius={18}
          fill={fill}
          stroke={stroke}
          strokeWidth={isFault ? 2 : 1.5}
          shadowColor={energized && !isFault ? '#22C55E' : undefined}
          shadowBlur={energized && !isFault ? 6 : 0}
        />

        <Group ref={rotorRef}>
          <Text
            text="M3"
            x={-10}
            y={-7}
            fontSize={12}
            fill={SymbolColors.bodyStroke}
            fontStyle="bold"
            listening={false}
          />
        </Group>

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={22}
          y={-8}
          width={96}
          fontSize={component.properties.labelFontSize ?? 9}
          fill={SymbolColors.labelMuted}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />
        <Text
          text={`${component.properties.powerWatts || 0}W`}
          x={22}
          y={4}
          fontSize={8}
          fill={SymbolColors.labelMuted}
          listening={false}
        />

        {isFault && (
          <Text
            text="OL"
            x={-8}
            y={8}
            fontSize={8}
            fill={SymbolColors.tripDark}
            fontStyle="bold"
            listening={false}
          />
        )}

        {showConnectionPoints && (
          <ConnectionPointDots connectionPoints={component.connectionPoints} />
        )}
      </ScaledSymbolInner>
    </Group>
  );
};

export default ThreePhaseMotorSymbol;
