import React from 'react';
import { Line, Circle } from 'react-konva';
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
