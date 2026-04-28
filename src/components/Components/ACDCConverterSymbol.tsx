import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const minX = -28;
const maxX = 28;
const minY = -22;
const maxY = 22;
const bodyW = maxX - minX;
const bodyH = maxY - minY;

const ACDCConverterSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const v = component.properties.voltage ?? 24;

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
            x={minX - 4}
            y={minY - 4}
            width={bodyW + 8}
            height={bodyH + 8}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        <Rect
          x={minX}
          y={minY}
          width={bodyW}
          height={bodyH}
          fill={energized ? '#DBEAFE' : '#F3F4F6'}
          stroke={energized ? '#1D4ED8' : '#374151'}
          strokeWidth={2}
          cornerRadius={3}
        />

        <Line
          points={[minX + 4, 0, maxX - 4, 0]}
          stroke={energized ? '#1D4ED8' : '#6B7280'}
          strokeWidth={1}
          dash={[3, 3]}
        />

        <Text
          text="~"
          x={minX + 2}
          y={minY + 2}
          fontSize={11}
          fill={energized ? '#1D4ED8' : '#6B7280'}
          fontStyle="bold"
          listening={false}
        />
        <Text
          text="="
          x={maxX - 12}
          y={minY + 4}
          fontSize={10}
          fill={energized ? '#1D4ED8' : '#6B7280'}
          fontStyle="bold"
          listening={false}
        />
        <Text
          text="AC"
          x={minX + 4}
          y={minY + 10}
          fontSize={6}
          fill="#6B7280"
          listening={false}
        />
        <Text
          text="DC"
          x={maxX - 14}
          y={minY + 10}
          fontSize={6}
          fill="#6B7280"
          listening={false}
        />
        <Text
          text={`${v} V`}
          x={minX}
          y={2}
          width={bodyW}
          align="center"
          fontSize={9}
          fill={energized ? '#1E3A8A' : '#374151'}
          fontStyle="bold"
          listening={false}
        />
        <Text
          text="AC → DC"
          x={minX}
          y={12}
          width={bodyW}
          align="center"
          fontSize={6}
          fill="#6B7280"
          listening={false}
        />

        {component.connectionPoints.map((cp) => {
          const u = cp.label.toUpperCase();
          const isAc = u.startsWith('AC');
          const stroke = u.includes('PLUS')
            ? '#DC2626'
            : u.includes('MINUS')
              ? '#1F2937'
              : u === 'AC_L'
                ? '#7C3F19'
                : '#2563EB';
          const stubY = isAc ? cp.y + 3 : cp.y - 3;
          const sign = u.includes('PLUS')
            ? '+'
            : u.includes('MINUS')
              ? '−'
              : u === 'AC_L'
                ? 'L'
                : 'N';
          const tagX = cp.x - 6;
          const tagY = isAc ? cp.y - 12 : cp.y + 4;
          return (
            <React.Fragment key={cp.id}>
              <Line
                points={[cp.x, stubY, cp.x, cp.y]}
                stroke={stroke}
                strokeWidth={2.5}
                lineCap="round"
              />
              <Text
                text={sign}
                x={tagX}
                y={tagY}
                width={12}
                align="center"
                fontSize={9}
                fill={stroke}
                fontStyle="bold"
                listening={false}
              />
            </React.Fragment>
          );
        })}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={minX - 4}
          y={maxY + 8}
          width={bodyW + 8}
          fontSize={component.properties.labelFontSize ?? 8}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

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

export default ACDCConverterSymbol;
