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
const minY = -26;
const maxY = 26;
const bodyW = maxX - minX;
const bodyH = maxY - minY;

/**
 * Switch-mode power supply (24/12/48 V DC). Same engine treatment as the
 * AC/DC converter, but a distinct industrial brick visual so panel diagrams
 * read as "PSU" rather than a generic rectifier.
 */
const SmpsSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
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
          fillLinearGradientStartPoint={{ x: 0, y: minY }}
          fillLinearGradientEndPoint={{ x: 0, y: maxY }}
          fillLinearGradientColorStops={
            energized
              ? [0, '#FFFBEB', 0.55, '#FEF3C7', 1, '#FDE68A']
              : [0, '#F8FAFC', 1, '#E5E7EB']
          }
          stroke={energized ? '#B45309' : '#374151'}
          strokeWidth={OUTLINE}
          cornerRadius={3}
          shadowColor="#111827"
          shadowBlur={5}
          shadowOpacity={0.2}
          shadowOffsetY={1.2}
        />
        <Rect
          x={minX + 2}
          y={minY + 2}
          width={bodyW - 4}
          height={bodyH - 4}
          stroke="#9CA3AF"
          strokeWidth={0.5}
          dash={[2, 3]}
          cornerRadius={2}
          listening={false}
        />
        <Rect
          x={minX + 8}
          y={minY + 11}
          width={bodyW - 16}
          height={4}
          fill="#334155"
          opacity={0.2}
          cornerRadius={2}
          listening={false}
        />
        <Rect
          x={minX + 5}
          y={minY + 7}
          width={bodyW - 10}
          height={1.4}
          fill="#FFFFFF"
          opacity={0.35}
          listening={false}
        />

        <Text
          text="SMPS"
          x={minX}
          y={minY + 4}
          width={bodyW}
          align="center"
          fontSize={10}
          fontStyle="bold"
          fill={energized ? '#7C2D12' : '#374151'}
          listening={false}
        />

        <Line
          points={[minX + 6, -4, minX + 9, -8, minX + 12, 0, minX + 15, -8, minX + 18, -4]}
          stroke={energized ? '#B45309' : '#6B7280'}
          strokeWidth={1.5}
          lineCap="round"
        />
        <Line
          points={[maxX - 18, -4, maxX - 12, -4, maxX - 12, 4, maxX - 6, 4]}
          stroke={energized ? '#B45309' : '#6B7280'}
          strokeWidth={1.5}
          lineCap="round"
        />

        <Text
          text={`${v} V DC`}
          x={minX}
          y={6}
          width={bodyW}
          align="center"
          fontSize={8}
          fontStyle="bold"
          fill={energized ? '#7C2D12' : '#374151'}
          listening={false}
        />
        <Text
          text="AC → DC"
          x={minX}
          y={16}
          width={bodyW}
          align="center"
          fontSize={6}
          fill="#6B7280"
          listening={false}
        />

        {[-18, -6, 6, 18].map((sx) => (
          <Circle
            key={`smps-screw-${sx}`}
            x={sx}
            y={maxY - 5}
            radius={1.3}
            fill="#6B7280"
            listening={false}
          />
        ))}
        {[-18, -6, 6, 18].map((sx) => (
          <Circle
            key={`smps-screw-top-${sx}`}
            x={sx}
            y={minY + 5}
            radius={1.2}
            fill="#94A3B8"
            listening={false}
          />
        ))}

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
          const tag = u.includes('PLUS')
            ? 'V+'
            : u.includes('MINUS')
              ? 'V−'
              : u === 'AC_L'
                ? 'L'
                : 'N';
          const tagX = cp.x - 8;
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
                text={tag}
                x={tagX}
                y={tagY}
                width={16}
                align="center"
                fontSize={8}
                fontStyle="bold"
                fill={stroke}
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
          fontSize={component.properties.labelFontSize ?? 9}
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

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
      </ScaledSymbolInner>
    </Group>
  );
};

export default SmpsSymbol;
