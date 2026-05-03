import React from 'react';
import { Group, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import {
  ConnectionPointDots,
  DeviceBody,
  SelectionFrame,
  StatusLed,
  TerminalPocket,
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

const DoorInterlockSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const closed = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const caption = component.type === 'mechanical_interlock' ? 'Mech' : 'Door';

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
        onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <SelectionFrame x={-22} y={-24} width={44} height={48} />
        )}

        <DeviceBody
          x={-16}
          y={-16}
          width={32}
          height={32}
          energized={energized}
          cornerRadius={3}
        />

        <TerminalPocket
          x={0}
          y={-17}
          leadToY={-20}
          label="1"
          labelY={-30}
        />
        <TerminalPocket
          x={0}
          y={17}
          leadToY={20}
          label="2"
          labelY={24}
        />

        {closed ? (
          <Line
            points={[0, -8, 0, 8]}
            stroke={SymbolColors.on}
            strokeWidth={2.3}
            lineCap="round"
          />
        ) : (
          <Line
            points={[0, -8, 9, 8]}
            stroke={SymbolColors.off}
            strokeWidth={2.3}
            lineCap="round"
          />
        )}

        <StatusLed
          x={10}
          y={-10}
          active={energized}
          color={SymbolColors.on}
        />

        <Text
          text={caption}
          x={-16}
          y={18}
          width={32}
          align="center"
          fontSize={7}
          fill={SymbolColors.labelMuted}
          listening={false}
        />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-30}
          y={28}
          width={60}
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

export default DoorInterlockSymbol;
