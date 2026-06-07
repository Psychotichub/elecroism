import React from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import type { SnapshotSheetVisualDiff } from '../../utils/projectSnapshotDiff';

type Props = {
  overlay: SnapshotSheetVisualDiff;
};

const SnapshotDiffOverlay: React.FC<Props> = ({ overlay }) => (
  <Group listening={false}>
    {overlay.removed.map((item, i) => (
      <Group key={`removed-${i}`}>
        <Circle
          x={item.x}
          y={item.y}
          radius={14}
          stroke="#EF4444"
          strokeWidth={1.5}
          dash={[4, 3]}
          fill="rgba(239,68,68,0.12)"
        />
        <Text
          x={item.x - 18}
          y={item.y - 22}
          width={36}
          text={item.label}
          fontSize={4}
          fill="#FCA5A5"
          align="center"
        />
      </Group>
    ))}

    {overlay.added.map((item, i) => (
      <Group key={`added-${i}`}>
        <Rect
          x={item.x - 16}
          y={item.y - 16}
          width={32}
          height={32}
          stroke="#22C55E"
          strokeWidth={1.5}
          fill="rgba(34,197,94,0.1)"
        />
        <Text
          x={item.x - 18}
          y={item.y - 22}
          width={36}
          text={item.label}
          fontSize={4}
          fill="#86EFAC"
          align="center"
        />
      </Group>
    ))}

    {overlay.moved.map((item, i) => (
      <Group key={`moved-${i}`}>
        <Line
          points={[item.fromX, item.fromY, item.toX, item.toY]}
          stroke="#F59E0B"
          strokeWidth={1.2}
          dash={[5, 4]}
        />
        <Circle
          x={item.fromX}
          y={item.fromY}
          radius={5}
          fill="rgba(245,158,11,0.35)"
          stroke="#F59E0B"
          strokeWidth={1}
        />
        <Circle
          x={item.toX}
          y={item.toY}
          radius={8}
          stroke="#F59E0B"
          strokeWidth={1.5}
          fill="rgba(245,158,11,0.15)"
        />
      </Group>
    ))}

    {overlay.modified.map((item, i) => (
      <Circle
        key={`modified-${i}`}
        x={item.x}
        y={item.y}
        radius={10}
        stroke="#3B82F6"
        strokeWidth={1.5}
        fill="rgba(59,130,246,0.12)"
      />
    ))}

    {overlay.wires.map((wire, i) => (
      <Group key={`wire-${wire.change}-${i}`}>
        {wire.change === 'modified' && wire.beforePoints ? (
          <Line
            points={wire.beforePoints}
            stroke="#EF4444"
            strokeWidth={1.2}
            dash={[6, 4]}
            opacity={0.55}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        <Line
          points={wire.points}
          stroke={
            wire.change === 'added'
              ? '#22C55E'
              : wire.change === 'removed'
                ? '#EF4444'
                : '#3B82F6'
          }
          strokeWidth={wire.change === 'modified' ? 2 : 1.8}
          dash={wire.change === 'removed' ? [5, 4] : undefined}
          opacity={wire.change === 'removed' ? 0.85 : 0.95}
          lineCap="round"
          lineJoin="round"
        />
      </Group>
    ))}

    <Text
      x={8}
      y={8}
      text={`Rev compare: ${overlay.baseLabel} → ${overlay.compareLabel}`}
      fontSize={5}
      fill="#E2E8F0"
      fontStyle="bold"
    />
    <Text
      x={8}
      y={16}
      text={`+${overlay.added.length} / -${overlay.removed.length} / ~${overlay.moved.length} moved / Δ${overlay.modified.length} · wires +${overlay.wiresAdded} -${overlay.wiresRemoved}`}
      fontSize={4}
      fill="#94A3B8"
    />
  </Group>
);

export default SnapshotDiffOverlay;
