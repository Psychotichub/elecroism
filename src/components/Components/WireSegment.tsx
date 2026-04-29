import React from 'react';
import { Line, Circle, Text } from 'react-konva';
import type { Wire } from '../../types';
import { getWireColor, getWireWidth } from '../../utils/geometry';

interface Props {
  wire: Wire;
  onSelect: () => void;
  selected: boolean;
}

const WireSegment: React.FC<Props> = ({ wire, onSelect, selected }) => {
  const color = getWireColor(wire.color);
  const width = getWireWidth(wire.crossSection);
  const opacity = wire.energized ? 1 : 0.92;
  const strokeWidth = selected ? width + 1 : width;
  const isEarthWire = wire.color === 'green_yellow';
  const isNeutralWire = wire.color === 'blue';
  const isEthernetWire = wire.color === 'ethernet';
  const mid = (() => {
    const pairCount = Math.floor(wire.points.length / 2);
    if (pairCount < 2) return null;
    const i1 = Math.max(0, Math.floor((pairCount - 1) / 2));
    const i2 = Math.min(pairCount - 1, i1 + 1);
    const x1 = wire.points[i1 * 2];
    const y1 = wire.points[i1 * 2 + 1];
    const x2 = wire.points[i2 * 2];
    const y2 = wire.points[i2 * 2 + 1];
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  })();

  return (
    <>
      {isEarthWire ? (
        <>
          <Line
            points={wire.points}
            stroke="#EAB308"
            strokeWidth={strokeWidth}
            opacity={opacity}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={8}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect();
            }}
            shadowColor={wire.energized ? '#65A30D' : undefined}
            shadowBlur={wire.energized ? 3 : 0}
          />
          <Line
            points={wire.points}
            stroke="#15803D"
            strokeWidth={Math.max(0.75, strokeWidth * 0.55)}
            opacity={opacity}
            dash={[9, 7]}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        </>
      ) : (
        <>
          <Line
            points={wire.points}
            stroke={color}
            strokeWidth={strokeWidth}
            opacity={opacity}
            dash={isEthernetWire ? [10, 6] : undefined}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={8}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect();
            }}
            shadowColor={wire.energized ? color : undefined}
            shadowBlur={wire.energized ? 3 : 0}
          />
          {isNeutralWire && (
            <Line
              points={wire.points}
              stroke="#93C5FD"
              strokeWidth={Math.max(0.5, strokeWidth * 0.45)}
              opacity={Math.min(1, opacity + 0.04)}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          {isEthernetWire && mid && (
            <Text
              x={mid.x - 11}
              y={mid.y - 8}
              width={22}
              text="ETH"
              align="center"
              fontSize={7}
              fill="#67E8F9"
              fontStyle="bold"
              listening={false}
            />
          )}
        </>
      )}
      {selected && (
        <>
          {Array.from(
            { length: wire.points.length / 2 },
            (_, i) => (
              <Circle
                key={i}
                x={wire.points[i * 2]}
                y={wire.points[i * 2 + 1]}
                radius={2}
                fill="#3B82F6"
              />
            )
          )}
        </>
      )}
    </>
  );
};

export default WireSegment;
