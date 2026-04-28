import React from 'react';
import { Layer, Line, Circle } from 'react-konva';
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
  /** Axis the next leg of the in-progress wire will follow. */
  wireOrientation: 'h' | 'v';
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
  wireOrientation,
  draftWireColor,
}) => {
  // Each click commits a single perpendicular segment ending at the cursor's
  // free coordinate, so the preview must show just that one segment — that
  // is exactly where the next turning point will land.
  const draftPoints = (() => {
    if (!wireInProgress || wirePoints.length < 2) return wirePoints;
    if (!cursorPos) return wirePoints;
    const lastX = wirePoints[wirePoints.length - 2];
    const lastY = wirePoints[wirePoints.length - 1];
    const nextX = wireOrientation === 'h' ? cursorPos.x : lastX;
    const nextY = wireOrientation === 'h' ? lastY : cursorPos.y;
    if (nextX === lastX && nextY === lastY) return wirePoints;
    return [...wirePoints, nextX, nextY];
  })();
  const previewTip = (() => {
    if (!wireInProgress || wirePoints.length < 2 || !cursorPos) return null;
    const lastX = wirePoints[wirePoints.length - 2];
    const lastY = wirePoints[wirePoints.length - 1];
    const nextX = wireOrientation === 'h' ? cursorPos.x : lastX;
    const nextY = wireOrientation === 'h' ? lastY : cursorPos.y;
    return { x: nextX, y: nextY };
  })();

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
          points={draftPoints}
          stroke={getWireColor(draftWireColor)}
          strokeWidth={1.5}
          opacity={0.9}
          dash={[6, 3]}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {previewTip && (
        <Circle
          x={previewTip.x}
          y={previewTip.y}
          radius={3}
          fill={getWireColor(draftWireColor)}
          opacity={0.85}
          listening={false}
        />
      )}
    </Layer>
  );
};

export default WireLayer;
