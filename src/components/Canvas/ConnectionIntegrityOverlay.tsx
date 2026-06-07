import React, { useMemo } from 'react';
import { Group, Circle, Line } from 'react-konva';
import type { Circuit } from '../../types';
import { connectionPointWorld } from '../../utils/geometry';
import { analyzeConnectionIntegrity } from '../../utils/connectionIntegrity';

type Props = {
  circuit: Circuit;
  panX: number;
  panY: number;
  zoom: number;
};

const ConnectionIntegrityOverlay: React.FC<Props> = ({
  circuit,
  panX,
  panY,
  zoom,
}) => {
  const summary = useMemo(
    () => analyzeConnectionIntegrity(circuit),
    [circuit]
  );

  const unwiredMarkers = useMemo(() => {
    return summary.issues
      .filter((i) => i.kind === 'unwired_terminal')
      .map((issue) => {
        const comp = circuit.components.find((c) => c.id === issue.componentId);
        const cp = comp?.connectionPoints.find((p) => p.id === issue.pointId);
        if (!comp || !cp) return null;
        const wp = connectionPointWorld(comp, cp);
        return { key: `${issue.componentId}:${issue.pointId}`, x: wp.x, y: wp.y };
      })
      .filter((m): m is { key: string; x: number; y: number } => m != null);
  }, [circuit, summary.issues]);

  const floatingMarkers = useMemo(() => {
    return summary.issues
      .filter((i) => i.kind === 'floating_wire_end')
      .map((issue) => {
        const wire = circuit.wires.find((w) => w.id === issue.wireId);
        if (!wire) return null;
        const comp = circuit.components.find((c) => c.id === issue.componentId);
        const cp = comp?.connectionPoints.find((p) => p.id === issue.pointId);
        if (comp && cp) {
          const wp = connectionPointWorld(comp, cp);
          return { key: `${issue.wireId}:${issue.end}`, x: wp.x, y: wp.y };
        }
        const pts = wire.points;
        if (pts.length < 2) return null;
        const idx = issue.end === 'from' ? 0 : pts.length - 2;
        return {
          key: `${issue.wireId}:${issue.end}`,
          x: pts[idx],
          y: pts[idx + 1],
        };
      })
      .filter((m): m is { key: string; x: number; y: number } => m != null);
  }, [circuit, summary.issues]);

  if (unwiredMarkers.length === 0 && floatingMarkers.length === 0) {
    return null;
  }

  return (
    <Group listening={false} x={panX} y={panY} scaleX={zoom} scaleY={zoom}>
      {unwiredMarkers.map((m) => (
        <Circle
          key={`u-${m.key}`}
          x={m.x}
          y={m.y}
          radius={7}
          stroke="#ef4444"
          strokeWidth={2}
          fill="rgba(239,68,68,0.25)"
        />
      ))}
      {floatingMarkers.map((m) => (
        <Group key={`f-${m.key}`} x={m.x} y={m.y}>
          <Line
            points={[-6, -6, 6, 6]}
            stroke="#ef4444"
            strokeWidth={2.5}
            lineCap="round"
          />
          <Line
            points={[-6, 6, 6, -6]}
            stroke="#ef4444"
            strokeWidth={2.5}
            lineCap="round"
          />
        </Group>
      ))}
    </Group>
  );
};

export default ConnectionIntegrityOverlay;
