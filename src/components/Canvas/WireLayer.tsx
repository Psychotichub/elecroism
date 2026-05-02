import React from 'react';
import { Layer, Line, Circle, Text } from 'react-konva';
import WireSegment from '../Components/WireSegment';
import type { Wire } from '../../types';
import { getWireColor } from '../../utils/geometry';
import type { WireSnapKind } from '../../utils/wireSnap';

export type WireSnapHud = { label: string; kind: WireSnapKind } | null;

export type WireTerminalPreview = {
  x: number;
  y: number;
  kind: 'valid' | 'invalid' | 'bend' | 'warning';
} | null;

interface Props {
  wires: Wire[];
  selectedId: string | null;
  panX: number;
  panY: number;
  zoom: number;
  onSelectWire: (id: string, world?: { x: number; y: number }) => void;
  wireInProgress: boolean;
  wirePoints: number[];
  cursorPos: { x: number; y: number } | null;
  /** Axis the next leg of the in-progress wire will follow. */
  wireOrientation: 'h' | 'v';
  /** When false, preview is a straight segment to the cursor (free angle). */
  wireOrthoEnabled: boolean;
  /** In-progress polyline stroke (matches finished wire inference). */
  draftWireColor: Wire['color'];
  /** Object/grid snap glyph label; drawn near the cursor while drafting. */
  wireSnapHud: WireSnapHud;
  /** Full dashed route when hovering a finish terminal (matches `finishWire`). */
  wireFullPreviewPolyline: number[] | null;
  /** Green / yellow / red ring on hovered finish terminal. */
  wireTerminalPreview: WireTerminalPreview;
  /** Short conductor tag (L1, N, PE, …) near the cursor when hovering a terminal. */
  wireTypeTag: string;
  /** Connection-rule hint (blocked or warning text). */
  wireRuleMessage: string;
  /** Master toggle for wire designator overlays. */
  wireLabelsMasterVisible: boolean;
}

const WireLayer: React.FC<Props> = ({
  wires,
  selectedId,
  panX,
  panY,
  zoom,
  onSelectWire,
  wireInProgress,
  wirePoints,
  cursorPos,
  wireOrientation,
  wireOrthoEnabled,
  draftWireColor,
  wireSnapHud,
  wireFullPreviewPolyline,
  wireTerminalPreview,
  wireTypeTag,
  wireRuleMessage,
  wireLabelsMasterVisible,
}) => {
  const draftPoints = (() => {
    if (!wireInProgress || wirePoints.length < 2) return wirePoints;
    if (!cursorPos) return wirePoints;
    const lastX = wirePoints[wirePoints.length - 2];
    const lastY = wirePoints[wirePoints.length - 1];
    if (!wireOrthoEnabled) {
      if (cursorPos.x === lastX && cursorPos.y === lastY) return wirePoints;
      return [...wirePoints, cursorPos.x, cursorPos.y];
    }
    const nextX = wireOrientation === 'h' ? cursorPos.x : lastX;
    const nextY = wireOrientation === 'h' ? lastY : cursorPos.y;
    if (nextX === lastX && nextY === lastY) return wirePoints;
    return [...wirePoints, nextX, nextY];
  })();

  const linePoints =
    wireFullPreviewPolyline && wireFullPreviewPolyline.length >= 4
      ? wireFullPreviewPolyline
      : draftPoints;

  const previewTip = (() => {
    if (!wireInProgress || !cursorPos) return null;
    if (wireFullPreviewPolyline && wireFullPreviewPolyline.length >= 4) {
      const p = wireFullPreviewPolyline;
      return { x: p[p.length - 2], y: p[p.length - 1] };
    }
    if (wirePoints.length < 2) return null;
    const lastX = wirePoints[wirePoints.length - 2];
    const lastY = wirePoints[wirePoints.length - 1];
    if (!wireOrthoEnabled) {
      return { x: cursorPos.x, y: cursorPos.y };
    }
    const nextX = wireOrientation === 'h' ? cursorPos.x : lastX;
    const nextY = wireOrientation === 'h' ? lastY : cursorPos.y;
    return { x: nextX, y: nextY };
  })();

  const terminalRing = (() => {
    if (!wireTerminalPreview) return null;
    const { x, y, kind } = wireTerminalPreview;
    const stroke =
      kind === 'invalid'
        ? '#EF4444'
        : kind === 'warning'
          ? '#F97316'
          : kind === 'bend'
            ? '#EAB308'
            : '#22C55E';
    const fill =
      kind === 'invalid'
        ? 'rgba(239,68,68,0.12)'
        : kind === 'warning'
          ? 'rgba(249,115,22,0.14)'
          : kind === 'bend'
            ? 'rgba(234,179,8,0.14)'
            : 'rgba(34,197,94,0.12)';
    return (
      <Circle
        x={x}
        y={y}
        radius={7}
        stroke={stroke}
        strokeWidth={2}
        fill={fill}
        listening={false}
      />
    );
  })();

  return (
    <Layer>
      {wires.map((wire) => (
        <WireSegment
          key={wire.id}
          wire={wire}
          selected={selectedId === wire.id}
          panX={panX}
          panY={panY}
          zoom={zoom}
          wireLabelsMasterVisible={wireLabelsMasterVisible}
          onSelect={(world) => onSelectWire(wire.id, world)}
        />
      ))}

      {wireInProgress && linePoints.length >= 2 && (
        <Line
          points={linePoints}
          stroke={getWireColor(draftWireColor)}
          strokeWidth={1.5}
          opacity={wireFullPreviewPolyline ? 0.92 : 0.9}
          dash={wireFullPreviewPolyline ? [5, 3, 2, 3] : [6, 3]}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
      {terminalRing}
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
      {wireSnapHud && cursorPos ? (
        <>
          <Line
            points={[
              cursorPos.x - 5,
              cursorPos.y,
              cursorPos.x + 5,
              cursorPos.y,
            ]}
            stroke="#FBBF24"
            strokeWidth={1.25}
            listening={false}
          />
          <Line
            points={[
              cursorPos.x,
              cursorPos.y - 5,
              cursorPos.x,
              cursorPos.y + 5,
            ]}
            stroke="#FBBF24"
            strokeWidth={1.25}
            listening={false}
          />
          {wireSnapHud.label ? (
            <Text
              x={cursorPos.x + 8}
              y={cursorPos.y - 14}
              text={wireSnapHud.label}
              fontSize={9}
              fontStyle="bold"
              fill="#EAB308"
              listening={false}
            />
          ) : null}
        </>
      ) : null}
      {wireTypeTag && cursorPos ? (
        <Text
          x={cursorPos.x + 8}
          y={cursorPos.y + 10}
          text={wireTypeTag}
          fontSize={8}
          fill="#93C5FD"
          fontStyle="bold"
          listening={false}
        />
      ) : null}
      {wireRuleMessage && cursorPos ? (
        <Text
          x={cursorPos.x + 8}
          y={cursorPos.y + 24}
          width={220}
          text={wireRuleMessage}
          fontSize={7}
          fill={
            wireTerminalPreview?.kind === 'invalid'
              ? '#FCA5A5'
              : '#FDBA74'
          }
          listening={false}
        />
      ) : null}
    </Layer>
  );
};

export default WireLayer;
