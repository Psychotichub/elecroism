import React from 'react';
import { Circle, Group, Rect, Text } from 'react-konva';
import type { CircuitComponent, NodeResult, ToolMode } from '../../types';
import type { PluginComponentTypeDef } from '../../types/plugin';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import {
  ConnectionPointDots,
  SelectionFrame,
} from './SymbolPrimitives';
import { SymbolColors } from './SymbolTokens';

type Props = {
  component: CircuitComponent;
  typeDef: PluginComponentTypeDef;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
  tool?: ToolMode;
  onToggle?: () => void;
};

const PluginSymbol: React.FC<Props> = ({
  component,
  typeDef,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
  tool,
  onToggle,
}) => {
  const energized = nodeResult?.energized ?? false;
  const sym = typeDef.symbol;
  const w = sym.width;
  const h = sym.height;
  const fill = sym.fill ?? (energized ? '#FDE68A' : SymbolColors.body);
  const stroke = sym.stroke ?? SymbolColors.bodyStroke;

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      draggable={tool === 'select'}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        if (!typeDef.toggleable || !onToggle) return;
        e.cancelBubble = true;
        onToggle();
      }}
      onDblTap={(e) => {
        if (!typeDef.toggleable || !onToggle) return;
        e.cancelBubble = true;
        onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected ? (
          <SelectionFrame x={-w * 0.5 - 4} y={-h * 0.5 - 4} width={w + 8} height={h + 8} />
        ) : null}
        {sym.shape === 'circle' ? (
          <Circle
            x={0}
            y={0}
            radius={Math.max(w, h) * 0.5}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.2}
          />
        ) : (
          <Rect
            x={-w * 0.5}
            y={-h * 0.5}
            width={w}
            height={h}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.2}
            cornerRadius={3}
          />
        )}
        {sym.glyph ? (
          <Text
            x={-w * 0.5}
            y={-5}
            width={w}
            text={sym.glyph}
            fontSize={9}
            fontStyle="bold"
            fill={SymbolColors.label}
            align="center"
          />
        ) : null}
        <ComponentCanvasLabel componentId={component.id} label={component.label} x={-w * 0.5} y={h * 0.5 + 6} width={w} />
        {showConnectionPoints ? (
          <ConnectionPointDots
            connectionPoints={component.connectionPoints}
          />
        ) : null}
      </ScaledSymbolInner>
    </Group>
  );
};

export default PluginSymbol;
