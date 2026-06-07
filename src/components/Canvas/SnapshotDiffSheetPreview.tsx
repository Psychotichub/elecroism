import React, { useMemo } from 'react';
import { Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import type { Circuit } from '../../types';
import {
  computeDrawingContentBounds,
  normalizeBounds,
} from '../../utils/drawingBounds';
import type { SnapshotSheetVisualDiff } from '../../utils/projectSnapshotDiff';

type Props = {
  circuit: Circuit | null;
  label: string;
  width: number;
  height: number;
  emphasis: 'base' | 'compare';
  visual: SnapshotSheetVisualDiff | null;
};

function componentColor(
  label: string,
  x: number,
  y: number,
  emphasis: 'base' | 'compare',
  visual: SnapshotSheetVisualDiff | null
): { stroke: string; fill: string } {
  if (!visual) {
    return { stroke: '#64748B', fill: 'rgba(100,116,139,0.15)' };
  }
  const norm = label.trim().toLowerCase();
  if (emphasis === 'compare') {
    if (visual.added.some((a) => a.label.toLowerCase() === norm)) {
      return { stroke: '#22C55E', fill: 'rgba(34,197,94,0.2)' };
    }
    if (
      visual.modified.some(
        (m) => m.label.toLowerCase() === norm && m.x === x && m.y === y
      )
    ) {
      return { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.18)' };
    }
    if (
      visual.moved.some(
        (m) =>
          m.label.toLowerCase() === norm && m.toX === x && m.toY === y
      )
    ) {
      return { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.18)' };
    }
  } else {
    if (visual.removed.some((r) => r.label.toLowerCase() === norm)) {
      return { stroke: '#EF4444', fill: 'rgba(239,68,68,0.18)' };
    }
    if (
      visual.moved.some(
        (m) =>
          m.label.toLowerCase() === norm && m.fromX === x && m.fromY === y
      )
    ) {
      return { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.18)' };
    }
    if (
      visual.modified.some(
        (m) => m.label.toLowerCase() === norm
      )
    ) {
      return { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.12)' };
    }
  }
  return { stroke: '#64748B', fill: 'rgba(100,116,139,0.12)' };
}

function wireColor(
  wireKey: string,
  emphasis: 'base' | 'compare',
  visual: SnapshotSheetVisualDiff | null
): string {
  if (!visual) return '#475569';
  const match = visual.wires.find((w) => w.wireKey === wireKey);
  if (!match) return '#475569';
  if (match.change === 'added') {
    return emphasis === 'compare' ? '#22C55E' : '#475569';
  }
  if (match.change === 'removed') {
    return emphasis === 'base' ? '#EF4444' : '#475569';
  }
  return '#3B82F6';
}

const SnapshotDiffSheetPreview: React.FC<Props> = ({
  circuit,
  label,
  width,
  height,
  emphasis,
  visual,
}) => {
  const transform = useMemo(() => {
    if (!circuit) return null;
    const raw = computeDrawingContentBounds(circuit);
    if (!raw) return null;
    const bounds = normalizeBounds(raw, 160);
    const contentW = bounds.maxX - bounds.minX;
    const contentH = bounds.maxY - bounds.minY;
    const pad = 12;
    const scale = Math.min(
      (width - pad * 2) / contentW,
      (height - pad * 2 - 18) / contentH,
      1.2
    );
    return {
      scale,
      offsetX: pad - bounds.minX * scale,
      offsetY: pad + 14 - bounds.minY * scale,
    };
  }, [circuit, width, height]);

  if (!circuit || !transform) {
    return (
      <div
        className="flex h-full min-h-[140px] flex-col rounded border border-white/10 bg-black/25"
        style={{ width }}
      >
        <div className="border-b border-white/10 px-2 py-1 text-[10px] font-medium text-slate-300">
          {label}
        </div>
        <div className="flex flex-1 items-center justify-center text-[10px] text-slate-500">
          Empty sheet
        </div>
      </div>
    );
  }

  const wireKeys = new Map(
    circuit.wires.map((w) => {
      const from = circuit.components.find((c) => c.id === w.fromComponentId);
      const to = circuit.components.find((c) => c.id === w.toComponentId);
      const fromPt =
        from?.connectionPoints.find((p) => p.id === w.fromPointId)?.label ??
        '?';
      const toPt =
        to?.connectionPoints.find((p) => p.id === w.toPointId)?.label ?? '?';
      const num = w.wireNumber?.trim();
      const key = num
        ? num
        : `${from?.label ?? '?'}:${fromPt}→${to?.label ?? '?'}:${toPt}`;
      return [w.id, key];
    })
  );

  return (
    <div
      className="flex h-full min-h-[180px] flex-col overflow-hidden rounded border border-white/10 bg-black/25"
      style={{ width }}
    >
      <div className="border-b border-white/10 px-2 py-1 text-[10px] font-medium text-slate-300">
        {label}
      </div>
      <Stage width={width} height={height - 28} listening={false}>
        <Layer>
          <Group
            scaleX={transform.scale}
            scaleY={transform.scale}
            x={transform.offsetX}
            y={transform.offsetY}
          >
            {circuit.wires.map((wire) => (
              <Line
                key={wire.id}
                points={wire.points}
                stroke={wireColor(wireKeys.get(wire.id) ?? '', emphasis, visual)}
                strokeWidth={1.4}
                lineCap="round"
                lineJoin="round"
              />
            ))}
            {circuit.components.map((comp) => {
              const colors = componentColor(
                comp.label,
                comp.x,
                comp.y,
                emphasis,
                visual
              );
              return (
                <Group key={comp.id}>
                  <Rect
                    x={comp.x - 10}
                    y={comp.y - 10}
                    width={20}
                    height={20}
                    stroke={colors.stroke}
                    strokeWidth={1.2}
                    fill={colors.fill}
                  />
                  <Text
                    x={comp.x - 14}
                    y={comp.y - 22}
                    width={28}
                    text={comp.label}
                    fontSize={5}
                    fill="#CBD5E1"
                    align="center"
                  />
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};

export default SnapshotDiffSheetPreview;
