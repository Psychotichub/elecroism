import React, { useMemo, useRef, useCallback } from 'react';
import { Group, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { useCircuitStore } from '../../store/circuitStore';
import { translateWireSegment } from '../../utils/wireGripUtils';

const GRIP = 3;

function stageToWorld(
  panX: number,
  panY: number,
  zoom: number,
  stageX: number,
  stageY: number
) {
  return {
    x: (stageX - panX) / zoom,
    y: (stageY - panY) / zoom,
  };
}

export type WireGripPhase = 'segments' | 'vertices';

/** Split z-order: segment grips under components, vertex grips above (endpoint retarget). */
const WireGripLayer: React.FC<{ phases?: WireGripPhase[] }> = ({
  phases = ['segments', 'vertices'],
}) => {
  const tool = useCircuitStore((s) => s.tool);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const wireGripVertexIndex = useCircuitStore((s) => s.wireGripVertexIndex);
  const circuit = useCircuitStore((s) => s.circuit);
  const setWireGripVertexIndex = useCircuitStore(
    (s) => s.setWireGripVertexIndex
  );
  const wireCadEditMode = useCircuitStore((s) => s.wireCadEditMode);
  const wireTrimFirstVertexIndex = useCircuitStore(
    (s) => s.wireTrimFirstVertexIndex
  );
  const trimWireBetweenGrips = useCircuitStore((s) => s.trimWireBetweenGrips);
  const setWireTrimFirstVertexIndex = useCircuitStore(
    (s) => s.setWireTrimFirstVertexIndex
  );
  const setWirePointsLive = useCircuitStore((s) => s.setWirePointsLive);
  const commitWireGripEdit = useCircuitStore((s) => s.commitWireGripEdit);
  const insertWireVertex = useCircuitStore((s) => s.insertWireVertex);
  const setSelected = useCircuitStore((s) => s.setSelected);

  const wire = useMemo(() => {
    if (!selectedId || tool !== 'select') return null;
    return circuit.wires.find((w) => w.id === selectedId) ?? null;
  }, [selectedId, tool, circuit.wires]);

  const vertexDragRef = useRef<{
    startPoints: number[];
    index: number;
    startVertexX: number;
    startVertexY: number;
  } | null>(null);

  const segmentDragRef = useRef<{
    startPoints: number[];
    segIndex: number;
    midX: number;
    midY: number;
  } | null>(null);

  const worldPointer = useCallback(
    (stage: Konva.Stage | null) => {
      if (!stage) return { x: 0, y: 0 };
      const p = stage.getPointerPosition();
      if (!p) return { x: 0, y: 0 };
      return stageToWorld(
        circuit.panX,
        circuit.panY,
        circuit.zoom,
        p.x,
        p.y
      );
    },
    [circuit.panX, circuit.panY, circuit.zoom]
  );

  if (!wire || wire.points.length < 4) return null;

  const pts = wire.points;
  const n = pts.length / 2;
  const wireId = wire.id;
  const showSegments = phases.includes('segments');
  const showVertices = phases.includes('vertices');

  const segmentNodes = showSegments
    ? Array.from({ length: n - 1 }, (_, segIdx) => {
        const x0 = pts[segIdx * 2];
        const y0 = pts[segIdx * 2 + 1];
        const x1 = pts[(segIdx + 1) * 2];
        const y1 = pts[(segIdx + 1) * 2 + 1];
        const mx = (x0 + x1) / 2;
        const my = (y0 + y1) / 2;
        const horizontal = Math.abs(y1 - y0) < 1e-6;
        const vertical = Math.abs(x1 - x0) < 1e-6;
        return (
          <React.Fragment key={`seg-${segIdx}`}>
            <Line
              points={[x0, y0, x1, y1]}
              stroke="rgba(0,0,0,0.02)"
              strokeWidth={10}
              hitStrokeWidth={16}
              onClick={(e) => {
                e.cancelBubble = true;
                setSelected(wireId, { clearWireGrip: true });
              }}
              onDblClick={(e) => {
                e.cancelBubble = true;
                const st = e.target.getStage();
                const wp = worldPointer(st);
                insertWireVertex(wireId, segIdx, wp.x, wp.y);
              }}
            />
            <Rect
              x={mx - GRIP}
              y={my - GRIP}
              width={GRIP * 2}
              height={GRIP * 2}
              fill="#FFFFFF"
              stroke="#2563EB"
              strokeWidth={0.45}
              draggable
              dragBoundFunc={
                horizontal && !vertical
                  ? (pos) => ({ x: mx - GRIP, y: pos.y })
                  : vertical && !horizontal
                    ? (pos) => ({ x: pos.x, y: my - GRIP })
                    : undefined
              }
              onDragStart={(e) => {
                e.cancelBubble = true;
                segmentDragRef.current = {
                  startPoints: [...wire.points],
                  segIndex: segIdx,
                  midX: mx,
                  midY: my,
                };
              }}
              onDragMove={(e) => {
                const d = segmentDragRef.current;
                if (!d) return;
                const cx = e.target.x() + GRIP;
                const cy = e.target.y() + GRIP;
                const rawDx = cx - d.midX;
                const rawDy = cy - d.midY;
                let tdx = rawDx;
                let tdy = rawDy;
                if (horizontal && !vertical) tdx = 0;
                else if (vertical && !horizontal) tdy = 0;
                const next = translateWireSegment(
                  d.startPoints,
                  d.segIndex,
                  tdx,
                  tdy
                );
                if (next) setWirePointsLive(wireId, next);
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                segmentDragRef.current = null;
                commitWireGripEdit(wireId, null);
              }}
            />
          </React.Fragment>
        );
      })
    : null;

  const vertexNodes = showVertices
    ? Array.from({ length: n }, (_, vi) => {
        const vx = pts[vi * 2];
        const vy = pts[vi * 2 + 1];
        const selectedGrip = wireGripVertexIndex === vi;
        return (
          <Rect
            key={`v-${vi}`}
            x={vx - GRIP}
            y={vy - GRIP}
            width={GRIP * 2}
            height={GRIP * 2}
            fill={selectedGrip ? '#2563EB' : '#FFFFFF'}
            stroke={selectedGrip ? '#F8FAFC' : '#2563EB'}
            strokeWidth={0.5}
            hitStrokeWidth={vi === 0 || vi === n - 1 ? 14 : 10}
            draggable
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              if (
                wireCadEditMode === 'trim' &&
                selectedId === wireId &&
                vi > 0 &&
                vi < n - 1
              ) {
                if (wireTrimFirstVertexIndex === null) {
                  setWireTrimFirstVertexIndex(vi);
                  setWireGripVertexIndex(vi);
                  return;
                }
                if (wireTrimFirstVertexIndex !== vi) {
                  trimWireBetweenGrips(
                    wireId,
                    wireTrimFirstVertexIndex,
                    vi
                  );
                }
                setWireGripVertexIndex(vi);
                return;
              }
              setWireGripVertexIndex(vi);
            }}
            onDragStart={(e) => {
              e.cancelBubble = true;
              vertexDragRef.current = {
                startPoints: [...wire.points],
                index: vi,
                startVertexX: vx,
                startVertexY: vy,
              };
            }}
            onDragMove={(e) => {
              const d = vertexDragRef.current;
              if (!d) return;
              const nx = e.target.x() + GRIP;
              const ny = e.target.y() + GRIP;
              const dx = nx - d.startVertexX;
              const dy = ny - d.startVertexY;
              const next = [...d.startPoints];
              next[d.index * 2] = d.startVertexX + dx;
              next[d.index * 2 + 1] = d.startVertexY + dy;
              setWirePointsLive(wireId, next);
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              const dragged = vertexDragRef.current?.index ?? null;
              vertexDragRef.current = null;
              commitWireGripEdit(wireId, dragged);
            }}
          />
        );
      })
    : null;

  return (
    <>
      {showSegments && <Group listening>{segmentNodes}</Group>}
      {showVertices && <Group listening>{vertexNodes}</Group>}
    </>
  );
};

export default WireGripLayer;
