import React from 'react';
import { Group, Circle, Line, Rect } from 'react-konva';
import Konva from 'konva';
import type { Circuit } from '../../types';
import { connectionPointWorld } from '../../utils/geometry';

export type HoveredConnectionPoint = {
  componentId: string;
  pointId: string;
  x: number;
  y: number;
} | null;

export type WireDockHint = {
  x: number;
  y: number;
  axis: 'h' | 'v';
  aligned: boolean;
};

interface Props {
  circuit: Circuit;
  hoveredConnectionPoint: HoveredConnectionPoint;
  setHoveredConnectionPoint: React.Dispatch<
    React.SetStateAction<HoveredConnectionPoint>
  >;
  wireDockHint: WireDockHint | null;
  onConnectionPointClick: (componentId: string, pointId: string) => void;
  /** When set and a wire is in progress, existing spans become T-junction targets (below terminals). */
  onFinishWireSpan?: (
    wireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => void;
  wireInProgress: boolean;
  wirePoints: number[];
}

function pointerToWorld(
  stage: Konva.Stage | null,
  circuit: Circuit
): { x: number; y: number } | null {
  if (!stage) return null;
  const p = stage.getPointerPosition();
  if (!p) return null;
  return {
    x: (p.x - circuit.panX) / circuit.zoom,
    y: (p.y - circuit.panY) / circuit.zoom,
  };
}

/**
 * Invisible hit targets on every terminal while the wire tool is active,
 * thick targets on existing wire spans for T-junctions, hover ring, and
 * perpendicular dock hint — extracted from CircuitCanvas.
 */
const WireToolOverlay: React.FC<Props> = ({
  circuit,
  hoveredConnectionPoint,
  setHoveredConnectionPoint,
  wireDockHint,
  onConnectionPointClick,
  onFinishWireSpan,
  wireInProgress,
  wirePoints,
}) => (
  <Group listening>
    {onFinishWireSpan &&
      wireInProgress &&
      wirePoints.length >= 2 &&
      circuit.wires.map((w) => {
        const pts = w.points;
        const pairCount = pts.length / 2;
        return (
          <React.Fragment key={w.id}>
            {Array.from({ length: Math.max(0, pairCount - 1) }, (_, segIdx) => {
              const si = segIdx * 2;
              const x0 = pts[si];
              const y0 = pts[si + 1];
              const x1 = pts[si + 2];
              const y1 = pts[si + 3];
              return (
                <Line
                  key={`${w.id}-span-${segIdx}`}
                  points={[x0, y0, x1, y1]}
                  stroke="rgba(59,130,246,0.04)"
                  strokeWidth={10}
                  hitStrokeWidth={18}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    const wld = pointerToWorld(e.target.getStage(), circuit);
                    if (wld)
                      onFinishWireSpan(w.id, segIdx, wld.x, wld.y);
                  }}
                />
              );
            })}
          </React.Fragment>
        );
      })}

    {circuit.components.flatMap((comp) =>
      comp.connectionPoints.map((cp) => {
        const { x: absX, y: absY } = connectionPointWorld(comp, cp);
        return (
          <Circle
            key={`${comp.id}-${cp.id}-hotspot`}
            x={absX}
            y={absY}
            radius={4.5}
            fill="#3B82F6"
            opacity={0.01}
            hitStrokeWidth={8}
            onClick={(e) => {
              e.cancelBubble = true;
              onConnectionPointClick(comp.id, cp.id);
            }}
            onMouseEnter={() =>
              setHoveredConnectionPoint({
                componentId: comp.id,
                pointId: cp.id,
                x: absX,
                y: absY,
              })
            }
            onMouseLeave={() => {
              setHoveredConnectionPoint((current) =>
                current &&
                current.componentId === comp.id &&
                current.pointId === cp.id
                  ? null
                  : current
              );
            }}
          />
        );
      })
    )}

    {hoveredConnectionPoint && (
      <Circle
        x={hoveredConnectionPoint.x}
        y={hoveredConnectionPoint.y}
        radius={3}
        stroke="#22C55E"
        strokeWidth={0.6}
        fill="rgba(34,197,94,0.08)"
        listening={false}
      />
    )}

    {wireDockHint &&
      (() => {
        const stroke = wireDockHint.aligned ? '#16A34A' : '#F59E0B';
        const fill = wireDockHint.aligned
          ? 'rgba(22,163,74,0.18)'
          : 'rgba(245,158,11,0.18)';
        const half = 4;
        const tickLen = 3;
        const stemPoints =
          wireDockHint.axis === 'h'
            ? [
                wireDockHint.x - half,
                wireDockHint.y,
                wireDockHint.x - half + tickLen,
                wireDockHint.y,
              ]
            : [
                wireDockHint.x,
                wireDockHint.y - half,
                wireDockHint.x,
                wireDockHint.y - half + tickLen,
              ];
        const tickPoints =
          wireDockHint.axis === 'h'
            ? [
                wireDockHint.x - half + tickLen,
                wireDockHint.y - tickLen,
                wireDockHint.x - half + tickLen,
                wireDockHint.y + tickLen,
              ]
            : [
                wireDockHint.x - tickLen,
                wireDockHint.y - half + tickLen,
                wireDockHint.x + tickLen,
                wireDockHint.y - half + tickLen,
              ];
        return (
          <>
            <Rect
              x={wireDockHint.x - half}
              y={wireDockHint.y - half}
              width={half * 2}
              height={half * 2}
              stroke={stroke}
              strokeWidth={0.6}
              fill={fill}
              listening={false}
            />
            <Line
              points={stemPoints}
              stroke={stroke}
              strokeWidth={0.6}
              lineCap="round"
              listening={false}
            />
            <Line
              points={tickPoints}
              stroke={stroke}
              strokeWidth={0.6}
              lineCap="round"
              listening={false}
            />
          </>
        );
      })()}
  </Group>
);

export default WireToolOverlay;
