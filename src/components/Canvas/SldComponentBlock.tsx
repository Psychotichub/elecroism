import React from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import type { CircuitComponent } from '../../types';
import { getCanvasInteractionColors } from '../../design/canvasInteractionColors';
import { sldBlockStyle, shouldRenderSldComponent } from '../../utils/sldView';

type Props = {
  component: CircuitComponent;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
};

const SldComponentBlock: React.FC<Props> = ({
  component,
  selected,
  draggable,
  onSelect,
  onDragEnd,
}) => {
  if (!shouldRenderSldComponent(component)) return null;

  const style = sldBlockStyle(component);
  const { x, y } = component;
  const selectionStroke = getCanvasInteractionColors().selection;

  const common = {
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: { target: { x: () => number; y: () => number } }) => {
      onDragEnd(e.target.x(), e.target.y());
    },
  };

  if (style.kind === 'dot') {
    return (
      <Circle
        {...common}
        x={x}
        y={y}
        radius={style.width * 0.5}
        fill={style.fill}
        stroke={selected ? selectionStroke : style.stroke}
        strokeWidth={selected ? 2 : 1}
      />
    );
  }

  if (style.kind === 'busbar') {
    return (
      <Group {...common} x={x} y={y}>
        <Line
          points={[-style.width * 0.5, 0, style.width * 0.5, 0]}
          stroke={selected ? selectionStroke : style.stroke}
          strokeWidth={style.height}
          lineCap="round"
          listening={false}
        />
        <Text
          x={-style.width * 0.5}
          y={-10}
          width={style.width}
          text={component.label}
          fontSize={5}
          fill="#E2E8F0"
          align="center"
          listening={false}
        />
      </Group>
    );
  }

  return (
    <Group {...common} x={x} y={y}>
      <Rect
        x={-style.width * 0.5}
        y={-style.height * 0.5}
        width={style.width}
        height={style.height}
        fill={style.fill}
        stroke={selected ? selectionStroke : style.stroke}
        strokeWidth={selected ? 1.8 : 1.2}
        cornerRadius={2}
        listening={false}
      />
      <Text
        x={-style.width * 0.5}
        y={-3}
        width={style.width}
        text={style.abbr}
        fontSize={4.5}
        fill="#F8FAFC"
        align="center"
        listening={false}
      />
      <Text
        x={-style.width * 0.5}
        y={-style.height * 0.5 - 7}
        width={style.width}
        text={component.label}
        fontSize={4.5}
        fill="#CBD5E1"
        align="center"
        listening={false}
      />
    </Group>
  );
};

export default SldComponentBlock;
