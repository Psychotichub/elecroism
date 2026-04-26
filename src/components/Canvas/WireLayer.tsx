import React from 'react';
import { Layer, Line } from 'react-konva';
import WireSegment from '../Components/WireSegment';
import type { Wire } from '../../types';
import { getWireColor } from '../../utils/geometry';

interface Props {
  wires: Wire[];
  selectedId: string | null;
  onSelectWire: (id: string) => void;
  wireInProgress: boolean;
  wirePoints: number[];
  cursorPos: { x: number; y: number } | null;
  /** In-progress polyline stroke (matches finished wire inference). */
  draftWireColor: Wire['color'];
}

const WireLayer: React.FC<Props> = ({
  wires,
  selectedId,
  onSelectWire,
  wireInProgress,
  wirePoints,
  cursorPos,
  draftWireColor,
}) => {
  return (
    <Layer>
      {wires.map((wire) => (
        <WireSegment
          key={wire.id}
          wire={wire}
          selected={selectedId === wire.id}
          onSelect={() => onSelectWire(wire.id)}
        />
      ))}

      {wireInProgress && wirePoints.length >= 2 && (
        <Line
          points={
            cursorPos
              ? [...wirePoints, cursorPos.x, cursorPos.y]
              : wirePoints
          }
          stroke={getWireColor(draftWireColor)}
          strokeWidth={1.5}
          opacity={0.9}
          dash={[6, 3]}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
    </Layer>
  );
};

export default WireLayer;
